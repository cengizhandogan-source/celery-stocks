"""
Celery Stocks Strategy SDK
===========================
This module is injected into the Pyodide environment before user strategy code runs.
Users write: from celery_sdk import *

Data globals (__celery_quotes__, __celery_candles__, etc.) are set by the TypeScript host.
"""


class Signal:
    BUY = "buy"
    SELL = "sell"
    HOLD = "hold"


# ---------------------------------------------------------------------------
# Data access
# ---------------------------------------------------------------------------

def get_price(symbol: str) -> dict:
    """Get current quote for a symbol.

    Returns dict with keys: price, change, changePercent, volume, high, low, open
    """
    return __celery_quotes__.get(symbol.upper(), {})


def get_prices(symbols: list) -> dict:
    """Get current quotes for multiple symbols. Returns {symbol: quote_dict}."""
    return {s.upper(): __celery_quotes__.get(s.upper(), {}) for s in symbols}


def get_candles(symbol: str, interval: str = "1d", range: str = "3m") -> list:
    """Get historical OHLC candles.

    Args:
        symbol: Ticker symbol (e.g. "AAPL")
        interval: "1d", "1wk", or "1mo"
        range: "1w", "1m", "3m", "1y", or "5y"

    Returns list of dicts: [{time, open, high, low, close, volume}, ...]
    """
    key = f"{symbol.upper()}:{interval}:{range}"
    return __celery_candles__.get(key, [])


def get_portfolio() -> list:
    """Get user's portfolio positions.

    Returns list of dicts: [{symbol, shares, avgCost}, ...]
    """
    return __celery_portfolio__


def get_watchlist() -> list:
    """Get user's watchlist symbols. Returns list of strings."""
    return __celery_watchlist__


# ---------------------------------------------------------------------------
# Signal emission
# ---------------------------------------------------------------------------

def emit_signal(symbol: str, signal: str, confidence: float = 1.0, reason: str = ""):
    """Emit a trading signal.

    Args:
        symbol: Ticker symbol
        signal: Signal.BUY, Signal.SELL, or Signal.HOLD
        confidence: 0.0 to 1.0
        reason: Human-readable explanation
    """
    if signal not in (Signal.BUY, Signal.SELL, Signal.HOLD):
        raise ValueError(f"Invalid signal: {signal}. Use Signal.BUY, Signal.SELL, or Signal.HOLD")
    if not 0.0 <= confidence <= 1.0:
        raise ValueError(f"Confidence must be between 0.0 and 1.0, got {confidence}")

    __celery_signals__.append({
        "symbol": symbol.upper(),
        "signal": signal,
        "confidence": confidence,
        "reason": reason,
    })


# ---------------------------------------------------------------------------
# Technical indicators (pure Python, no numpy dependency)
# ---------------------------------------------------------------------------

def sma(prices: list, period: int) -> list:
    """Simple Moving Average.

    Returns list same length as prices. First (period-1) values are None.
    """
    if period < 1 or period > len(prices):
        return [None] * len(prices)
    result = [None] * (period - 1)
    window_sum = sum(prices[:period])
    result.append(window_sum / period)
    for i in range(period, len(prices)):
        window_sum += prices[i] - prices[i - period]
        result.append(window_sum / period)
    return result


def ema(prices: list, period: int) -> list:
    """Exponential Moving Average.

    Returns list same length as prices. First (period-1) values are None.
    """
    if period < 1 or period > len(prices):
        return [None] * len(prices)
    k = 2.0 / (period + 1)
    result = [None] * (period - 1)
    seed = sum(prices[:period]) / period
    result.append(seed)
    for i in range(period, len(prices)):
        val = prices[i] * k + result[-1] * (1 - k)
        result.append(val)
    return result


def rsi(prices: list, period: int = 14) -> list:
    """Relative Strength Index.

    Returns list same length as prices. First `period` values are None.
    """
    if period < 1 or len(prices) < period + 1:
        return [None] * len(prices)

    result = [None] * period
    gains = []
    losses = []

    for i in range(1, period + 1):
        diff = prices[i] - prices[i - 1]
        gains.append(max(diff, 0))
        losses.append(max(-diff, 0))

    avg_gain = sum(gains) / period
    avg_loss = sum(losses) / period

    if avg_loss == 0:
        result.append(100.0)
    else:
        rs = avg_gain / avg_loss
        result.append(100.0 - 100.0 / (1 + rs))

    for i in range(period + 1, len(prices)):
        diff = prices[i] - prices[i - 1]
        gain = max(diff, 0)
        loss = max(-diff, 0)
        avg_gain = (avg_gain * (period - 1) + gain) / period
        avg_loss = (avg_loss * (period - 1) + loss) / period

        if avg_loss == 0:
            result.append(100.0)
        else:
            rs = avg_gain / avg_loss
            result.append(100.0 - 100.0 / (1 + rs))

    return result


def macd(prices: list, fast: int = 12, slow: int = 26, signal_period: int = 9) -> dict:
    """Moving Average Convergence Divergence.

    Returns dict with keys: macd_line, signal_line, histogram (all lists).
    """
    fast_ema = ema(prices, fast)
    slow_ema = ema(prices, slow)

    macd_line = []
    for f, s in zip(fast_ema, slow_ema):
        if f is not None and s is not None:
            macd_line.append(f - s)
        else:
            macd_line.append(None)

    macd_values = [v for v in macd_line if v is not None]
    signal_line_raw = ema(macd_values, signal_period) if len(macd_values) >= signal_period else [None] * len(macd_values)

    signal_line = [None] * (len(macd_line) - len(signal_line_raw)) + signal_line_raw

    histogram = []
    for m, s in zip(macd_line, signal_line):
        if m is not None and s is not None:
            histogram.append(m - s)
        else:
            histogram.append(None)

    return {"macd_line": macd_line, "signal_line": signal_line, "histogram": histogram}


def bollinger_bands(prices: list, period: int = 20, std_dev: float = 2.0) -> dict:
    """Bollinger Bands.

    Returns dict with keys: upper, middle, lower (all lists).
    """
    middle = sma(prices, period)
    upper = []
    lower = []

    for i in range(len(prices)):
        if middle[i] is None:
            upper.append(None)
            lower.append(None)
        else:
            window = prices[i - period + 1:i + 1]
            mean = middle[i]
            variance = sum((x - mean) ** 2 for x in window) / period
            std = variance ** 0.5
            upper.append(mean + std_dev * std)
            lower.append(mean - std_dev * std)

    return {"upper": upper, "middle": middle, "lower": lower}


def vwap(candles: list) -> list:
    """Volume Weighted Average Price.

    Takes candle dicts with keys: high, low, close, volume.
    Returns list of VWAP values (same length as candles).
    """
    result = []
    cum_volume = 0
    cum_tp_volume = 0

    for c in candles:
        tp = (c.get("high", 0) + c.get("low", 0) + c.get("close", 0)) / 3
        vol = c.get("volume", 0) or 0
        cum_volume += vol
        cum_tp_volume += tp * vol
        if cum_volume > 0:
            result.append(cum_tp_volume / cum_volume)
        else:
            result.append(None)

    return result


def crossover(series_a: list, series_b: list) -> bool:
    """Check if series_a just crossed above series_b (at the last data point).

    Returns True if series_a[-2] <= series_b[-2] and series_a[-1] > series_b[-1].
    """
    if len(series_a) < 2 or len(series_b) < 2:
        return False
    a1, a2 = series_a[-2], series_a[-1]
    b1, b2 = series_b[-2], series_b[-1]
    if any(v is None for v in (a1, a2, b1, b2)):
        return False
    return a1 <= b1 and a2 > b2


def crossunder(series_a: list, series_b: list) -> bool:
    """Check if series_a just crossed below series_b (at the last data point)."""
    if len(series_a) < 2 or len(series_b) < 2:
        return False
    a1, a2 = series_a[-2], series_a[-1]
    b1, b2 = series_b[-2], series_b[-1]
    if any(v is None for v in (a1, a2, b1, b2)):
        return False
    return a1 >= b1 and a2 < b2
