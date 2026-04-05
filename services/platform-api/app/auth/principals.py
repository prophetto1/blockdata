"""AuthPrincipal — unified identity type for all auth sources."""

from dataclasses import dataclass, field


@dataclass(frozen=True)
class AuthPrincipal:
    subject_type: str  # "machine" | "user"
    subject_id: str
    roles: frozenset[str] = field(default_factory=frozenset)
    auth_source: str = ""  # "legacy_header" | "m2m_bearer" | "supabase_jwt"
    email: str = ""  # populated for user JWTs
    admin_role_verification_failed: bool = False

    def has_role(self, role: str) -> bool:
        return role in self.roles

    @property
    def user_id(self) -> str:
        """Alias for subject_id — admin_services.py accesses su.user_id."""
        return self.subject_id

    @property
    def is_superuser(self) -> bool:
        return "platform_admin" in self.roles
