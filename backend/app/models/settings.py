"""
Settings Models

Pydantic models for user settings management.
Matches database schema from user_profiles and platform_credentials tables.
"""

from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, Field, field_validator


class UserProfile(BaseModel):
    """User profile model."""
    
    user_id: str = Field(..., description="User UUID")
    subscription_tier: str = Field(..., description="Subscription tier")
    subscription_status: str = Field(..., description="Subscription status")
    
    @field_validator('subscription_tier')
    @classmethod
    def validate_subscription_tier(cls, v: str) -> str:
        """Validate subscription tier."""
        allowed = {'free', 'pro', 'agency'}
        if v not in allowed:
            raise ValueError(f"subscription_tier must be one of {allowed}")
        return v
    
    @field_validator('subscription_status')
    @classmethod
    def validate_subscription_status(cls, v: str) -> str:
        """Validate subscription status."""
        allowed = {'active', 'cancelled', 'expired'}
        if v not in allowed:
            raise ValueError(f"subscription_status must be one of {allowed}")
        return v


class UserPreferences(BaseModel):
    """User preferences model."""
    
    default_strategy_id: Optional[str] = Field(None, description="Default strategy UUID")
    notification_email: bool = Field(default=True, description="Email notifications enabled")
    notification_browser: bool = Field(default=True, description="Browser notifications enabled")
    theme: str = Field(default='system', description="Theme preference")
    language: str = Field(default='en', description="Language preference")
    
    @field_validator('theme')
    @classmethod
    def validate_theme(cls, v: str) -> str:
        """Validate theme."""
        allowed = {'system', 'light', 'dark'}
        if v not in allowed:
            raise ValueError(f"theme must be one of {allowed}")
        return v


class UserPreferencesUpdate(BaseModel):
    """Model for updating user preferences."""
    
    default_strategy_id: Optional[str] = None
    notification_email: Optional[bool] = None
    notification_browser: Optional[bool] = None
    theme: Optional[str] = None
    language: Optional[str] = None
    
    @field_validator('theme')
    @classmethod
    def validate_theme(cls, v: Optional[str]) -> Optional[str]:
        """Validate theme if provided."""
        if v is not None:
            allowed = {'system', 'light', 'dark'}
            if v not in allowed:
                raise ValueError(f"theme must be one of {allowed}")
        return v


class PlatformCredential(BaseModel):
    """Platform credential model."""
    
    id: str = Field(..., description="Credential UUID")
    user_id: str = Field(..., description="User UUID")
    platform: str = Field(..., description="Platform name")
    is_active: bool = Field(default=True, description="Whether credential is active")
    last_verified_at: Optional[datetime] = Field(None, description="Last verification timestamp")
    verification_error: Optional[str] = Field(None, description="Verification error message")
    expires_at: Optional[datetime] = Field(None, description="Credential expiration timestamp")
    
    @field_validator('platform')
    @classmethod
    def validate_platform(cls, v: str) -> str:
        """Validate platform."""
        allowed = {'upwork', 'freelancer', 'custom'}
        if v not in allowed:
            raise ValueError(f"platform must be one of {allowed}")
        return v
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class CredentialUpsert(BaseModel):
    """Model for creating or updating platform credentials."""
    
    platform: str = Field(..., description="Platform name")
    api_key: Optional[str] = Field(None, description="API key (encrypted)")
    api_secret: Optional[str] = Field(None, description="API secret (encrypted)")
    access_token: Optional[str] = Field(None, description="Access token (encrypted)")
    refresh_token: Optional[str] = Field(None, description="Refresh token (encrypted)")
    
    @field_validator('platform')
    @classmethod
    def validate_platform(cls, v: str) -> str:
        """Validate platform."""
        allowed = {'upwork', 'freelancer', 'custom'}
        if v not in allowed:
            raise ValueError(f"platform must be one of {allowed}")
        return v


class VerificationResult(BaseModel):
    """Credential verification result model."""
    
    is_valid: bool = Field(..., description="Whether credential is valid")
    verified_at: datetime = Field(..., description="Verification timestamp")
    error: Optional[str] = Field(None, description="Error message if verification failed")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class UsageQuota(BaseModel):
    """Usage quota model."""
    
    proposals_generated: int = Field(..., description="Number of proposals generated")
    proposals_limit: int = Field(..., description="Proposal limit for period")
    period_start: Optional[datetime] = Field(None, description="Period start timestamp")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class SubscriptionInfo(BaseModel):
    """Subscription information model."""
    
    tier: str = Field(..., description="Subscription tier")
    status: str = Field(..., description="Subscription status")
    expires_at: Optional[datetime] = Field(None, description="Expiration timestamp")
    usage_quota: UsageQuota = Field(..., description="Usage quota information")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class UserSettings(BaseModel):
    """Complete user settings model."""
    
    profile: UserProfile = Field(..., description="User profile")
    preferences: UserPreferences = Field(..., description="User preferences")
    credentials: List[PlatformCredential] = Field(default_factory=list, description="Platform credentials")
    subscription: SubscriptionInfo = Field(..., description="Subscription information")
