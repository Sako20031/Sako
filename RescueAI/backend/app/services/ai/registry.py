from ...config import get_settings
from .base import AIProvider, UnavailableProvider

_override: AIProvider | None = None
_cached: AIProvider | None = None


def set_provider(provider: AIProvider | None) -> None:
    """Test hook: inject a provider (e.g. Anthropic client on a mock transport)."""
    global _override
    _override = provider


def get_provider() -> AIProvider:
    if _override is not None:
        return _override
    s = get_settings()
    if not s.ai_configured:
        return UnavailableProvider("not_configured")
    global _cached
    if _cached is None:
        from .anthropic_provider import AnthropicProvider

        _cached = AnthropicProvider(s.anthropic_api_key, s.ai_model, s.ai_timeout_seconds,
                                    s.ai_max_retries, s.ai_effort)
    return _cached
