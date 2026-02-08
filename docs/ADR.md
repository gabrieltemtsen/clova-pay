# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) for the ClovaPay project.

## ADRs

### ADR-001: Stacks on Bitcoin
**Decision**: Use Stacks blockchain for smart contract deployment

**Rationale**: 
- Built on Bitcoin security
- Clarity language prevents common exploits
- Strong developer ecosystem

### ADR-002: Hybrid Bridge Architecture
**Decision**: Use hybrid on-chain/off-chain architecture

**Rationale**:
- On-chain escrow for security and transparency
- Off-chain processing for fiat settlement via Paycrest
- Best of both worlds

### ADR-003: Multi-Admin Support
**Decision**: Implement multi-admin with time-locked transfers

**Rationale**:
- Single admin is a security risk
- Time delays prevent instant hostile takeovers
- Owner retains ultimate control
