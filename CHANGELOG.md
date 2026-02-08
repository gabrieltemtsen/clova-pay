# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - 2026-02

### Added
- Multi-admin support with `add-admin` and `remove-admin` functions
- Time-locked admin transfers (144 block delay for security)
- Partial refunds for failed settlements (`partial-refund`)
- Batch operations (`batch-mark-processing` for up to 20 orders)
- Order expiry system with `expire-order` function
- `is-authorized-admin` read-only check
- Enhanced event emissions with block heights
- UGX and TZS currency support

### Changed
- Updated `is-admin` to support multi-admin list
- All events now include `block-height` for indexing

### Security
- Time-locked admin transfers prevent instant takeover
- Order expiry protects against stale escrow funds

## [1.0.0] - 2024

### Added
- Initial smart contract implementation
- STX and SIP-010 token support
- Multi-currency fiat support (NGN, KES, GHS)
- Rate limiting and security controls
- NestJS backend API
- Comprehensive test suite

### Security
- Order amount limits (min/max)
- User cooldowns between orders
- Daily volume caps
- Admin-only configuration functions
