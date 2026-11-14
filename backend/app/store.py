"""Picks the backend: app.fake (FAKE_MODE=true) or app.pipeline (Neon). Everything (routes, packet,
calls) goes through here so it works in both modes. Owner: Aryan."""
from app.config import FAKE_MODE

if FAKE_MODE:
    from app import fake as _impl
else:
    from app import pipeline as _impl

create_search = _impl.create_search
get = _impl.get
verify = _impl.verify
call_complete = _impl.call_complete
