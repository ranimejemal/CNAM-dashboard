# CNAM Dashboard - System Documentation Manual

**Version:** 1.0  
**Last Updated:** February 2026  
**Classification:** Internal Use Only

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [User / Assuré Dashboard](#2-user--assuré-dashboard)
3. [Prestataire Dashboard](#3-prestataire-dashboard)
4. [Admin Normal Dashboard](#4-admin-normal-dashboard)
5. [Admin Supérieur (Owner) Dashboard](#5-admin-supérieur-owner-dashboard)
6. [IT / Security Engineer Dashboard](#6-it--security-engineer-dashboard)
7. [Cross-Dashboard Interactions](#7-cross-dashboard-interactions)
8. [Security Architecture](#8-security-architecture)
9. [Appendices](#9-appendices)

---

## 1. Executive Summary

### 1.1 Platform Overview

The CNAM Dashboard is a secure, role-based digital platform designed to centralize and streamline health insurance operations for the Caisse Nationale d'Assurance Maladie (CNAM). The platform serves five distinct user categories, each with dedicated dashboards tailored to their operational needs.

### 1.2 Core Objectives

| Objective | Description |
|-----------|-------------|
| **Centralization** | Unify all CNAM services into a single secure web platform |
| **Identity Verification** | Enforce strict document validation for all account types |
| **Access Control** | Implement Admin Sup (Owner) approval for all privileged roles |
| **Separation of Duties** | Isolate business administration from cybersecurity operations |
| **Auditability** | Maintain complete traceability of all system actions |

### 1.3 Security Principles

The platform adheres to industry-standard security frameworks:

- **Defense-in-Depth**: Multiple layers of security controls
- **Zero Trust**: No implicit trust for any user or system
- **Least Privilege**: Minimum necessary permissions per role
- **Audit & Traceability**: Comprehensive logging of all actions

---

## 2. User / Assuré Dashboard

### 2.1 Purpose

The User Dashboard provides CNAM beneficiaries (assurés) with a secure interface to:

- Access personal health insurance services
- Submit and track reimbursement requests
- Manage official CNAM documents
- View scheduled events and appointments

### 2.2 Key Features and Actions

#### 2.2.1 Account Registration & Validation

```
Registration Flow:
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Create Account │ -> │  Verify Email   │ -> │ Submit CNAM Doc │
│  (email/pwd)    │    │  (code/link)    │    │ (attestation)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                      │
                                                      v
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Access Granted │ <- │ Admin Sup       │ <- │ Account Pending │
│  (Active)       │    │ Approval        │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

**Steps:**
1. Create account with email and password
2. Verify email through OTP code or verification link
3. Submit personal information and official CNAM document
4. Account remains in **Pending** status until Admin Sup validation
5. Upon approval, account status changes to **Active**

#### 2.2.2 Document Management

| Action | Description | Status Tracking |
|--------|-------------|-----------------|
| **Upload** | Submit CNAM documents for validation | Pending → Approved/Rejected |
| **View** | Check document validation status | Real-time updates |
| **Download** | Retrieve approved documents | Available after approval |

**Supported Document Types:**
- Attestation d'assurance
- Factures médicales
- Ordonnances
- Certificats médicaux
- Rapports médicaux
- Carte CNAM
- Bilans de santé

#### 2.2.3 Reimbursement Management

| Action | Description |
|--------|-------------|
| **Submit Request** | Create new reimbursement request with supporting documents |
| **Track Status** | Monitor request progress through workflow stages |
| **View History** | Access complete reimbursement history |

**Status Workflow:**
```
En attente → En traitement → Approuvé / Rejeté
```

#### 2.2.4 Calendar & Events

- View scheduled meetings and appointments
- Receive reminders for document renewals
- Track audit schedules and deadlines

### 2.3 Permissions & Restrictions

#### Authorized Actions
- ✅ View and manage personal profile
- ✅ Upload and track personal documents
- ✅ Submit reimbursement requests
- ✅ View personal calendar events
- ✅ Receive notifications

#### Restricted Actions
- ❌ Access other users' data
- ❌ View Admin, Prestataire, or Security dashboards
- ❌ Modify system settings
- ❌ Approve/reject any requests

### 2.4 Security Measures

| Measure | Implementation |
|---------|----------------|
| **Authentication** | Email/password with session tokens |
| **Session Management** | JWT tokens with automatic expiration |
| **Data Access** | Row Level Security (RLS) limiting to personal data |
| **Password Policy** | Minimum 12 characters with complexity requirements |

---

## 3. Prestataire Dashboard

### 3.1 Purpose

The Prestataire Dashboard enables healthcare providers to:

- Manage patient service documentation
- Submit and track CNAM-related operations
- Monitor service statistics and performance
- Interact with the reimbursement system

### 3.2 Key Features and Actions

#### 3.2.1 Account Types & Registration

| Provider Type | Description | Examples |
|---------------|-------------|----------|
| **Hospital** | Medical institutions | CHU, Cliniques privées |
| **Doctor** | Individual practitioners | Médecins généralistes, Spécialistes |
| **Pharmacy** | Pharmaceutical providers | Pharmacies d'officine |
| **Laboratory** | Diagnostic centers | Laboratoires d'analyses |

**Registration Flow:**
1. Select provider type (Hospital/Doctor/Pharmacy/Laboratory)
2. Submit professional credentials and documentation
3. Account enters **Pending** status
4. Admin Sup reviews and validates
5. Upon approval, full dashboard access granted

#### 3.2.2 Document Submission

| Document Type | Purpose |
|---------------|---------|
| Service invoices | Claim reimbursement for provided services |
| Medical reports | Support patient claims |
| Prescription records | Verify medication dispensed |
| Treatment summaries | Document care provided |

#### 3.2.3 Status Tracking

**Document Status:**
```
Soumis → En révision → Validé / Rejeté
```

**Reimbursement Status:**
```
En attente → En traitement → Approuvé / Rejeté
```

#### 3.2.4 Operational Statistics

- Number of patients served
- Documents processed
- Reimbursements approved/rejected
- Average processing time

### 3.3 Permissions & Restrictions

#### Authorized Actions
- ✅ Submit service-related documents
- ✅ Track document and reimbursement statuses
- ✅ View operational statistics
- ✅ Update provider profile information

#### Restricted Actions
- ❌ Manage users or employees
- ❌ Access security operations
- ❌ Approve/reject reimbursements
- ❌ View other providers' data

### 3.4 Security Measures

| Measure | Implementation |
|---------|----------------|
| **Authentication** | Email/password with provider verification |
| **Data Isolation** | RLS policies limiting to provider's own data |
| **Audit Trail** | All submissions logged with timestamps |

---

## 4. Admin Normal Dashboard

### 4.1 Purpose

The Admin Normal Dashboard supports day-to-day operational management:

- Process reimbursement requests
- Validate submitted documents
- Manage calendar events
- Generate operational reports

> **Note:** Admin Normal has NO access to security operations or role management.

### 4.2 Key Features and Actions

#### 4.2.1 Reimbursement Processing

| Action | Description | Workflow |
|--------|-------------|----------|
| **Review** | Examine reimbursement request details | View submitted documents |
| **Approve** | Accept valid requests | Status → Approuvé |
| **Reject** | Decline invalid requests | Status → Rejeté (with reason) |

**Example Workflow:**
```
1. User submits reimbursement request
2. Admin Normal receives notification
3. Reviews attached documents
4. Verifies eligibility and amounts
5. Approves or rejects with justification
6. User receives status notification
```

#### 4.2.2 Document Validation

| Document Type | Validation Criteria |
|---------------|---------------------|
| Attestation | Authenticity, expiry date |
| Facture | Amount accuracy, provider validity |
| Ordonnance | Prescription validity, date |
| Certificat | Medical accuracy, signatures |

#### 4.2.3 Event Management

- **Plan Events**: Schedule meetings, audits, reminders
- **Modify Events**: Update event details and participants
- **Delete Events**: Remove cancelled events
- **View Calendar**: Access comprehensive event calendar

#### 4.2.4 Report Generation

| Report Type | Contents |
|-------------|----------|
| User Reports | Registration statistics, account statuses |
| Provider Reports | Provider activity, document submissions |
| Reimbursement Reports | Processing statistics, approval rates |
| Document Reports | Validation statistics, rejection reasons |

**Export Formats:** CSV, PDF

### 4.3 Permissions & Restrictions

#### Authorized Actions
- ✅ Approve/reject reimbursement requests
- ✅ Validate/reject documents
- ✅ Plan, modify, delete calendar events
- ✅ Generate and export reports
- ✅ Consult employee list (view-only)

#### Restricted Actions
- ❌ Assign or remove Admin roles
- ❌ Create new admin accounts
- ❌ Access security logs or SIEM
- ❌ Manage security incidents
- ❌ Approve User/Prestataire accounts
- ❌ Delete other administrators

### 4.4 Approval Dependencies

```
┌─────────────────────────────────────────────────────────────┐
│ Actions Requiring Admin Sup (Owner) Validation:            │
├─────────────────────────────────────────────────────────────┤
│ • Creating new Admin Normal accounts                       │
│ • Modifying role permissions                               │
│ • Accessing sensitive audit logs                           │
│ • Bulk operations on user accounts                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Admin Supérieur (Owner) Dashboard

### 5.1 Purpose

The Admin Supérieur serves as the **Owner** with complete governance authority:

- Full oversight of all functional operations
- Employee and role management
- User and Prestataire account validation
- Final approval authority for privileged actions

### 5.2 Key Features and Actions

#### 5.2.1 Employee Management

| Action | Description |
|--------|-------------|
| **Add Employee** | Create new Admin Normal or IT accounts |
| **Remove Employee** | Deactivate or delete employee accounts |
| **Validate Employee** | Approve pending employee registrations |
| **Reject Employee** | Decline employee registration requests |

**Exclusive Privilege:**
> Only the designated Admin Sup (Owner: `ranime.jemal@esprim.tn`) can create or delete administrator accounts.

#### 5.2.2 Role & Permission Management

| Role | Can Assign | Can Revoke |
|------|------------|------------|
| Admin Normal | ✅ | ✅ |
| IT/Security | ✅ | ✅ |
| Validator | ✅ | ✅ |

#### 5.2.3 Account Validation

**User Account Validation:**
```
Pending User Request → Admin Sup Review → Approve/Reject → User Notification
```

**Prestataire Account Validation:**
```
Pending Provider Request → Admin Sup Review → Approve/Reject → Provider Notification
```

#### 5.2.4 Complete Operational Control

| Domain | Capabilities |
|--------|--------------|
| **Reimbursements** | Approve, reject, override decisions |
| **Documents** | Validate, reject, request additional info |
| **Events** | Full calendar management |
| **Reports** | Access all report types, audit trails |

### 5.3 Permissions Summary

#### Full Access Rights
- ✅ All Admin Normal capabilities
- ✅ Create/delete administrator accounts
- ✅ Assign and revoke roles
- ✅ Validate User and Prestataire accounts
- ✅ Access comprehensive audit logs
- ✅ Override Admin Normal decisions
- ✅ Generate governance reports

#### Restricted Actions
- ❌ Direct access to security incident handling (IT/Security domain)
- ❌ Modify security configurations (IT/Security domain)

### 5.4 Governance Responsibilities

```
┌──────────────────────────────────────────────────────────────────┐
│                    Admin Sup (Owner) Governance                   │
├──────────────────────────────────────────────────────────────────┤
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐     │
│  │ Employee       │  │ Account        │  │ Role           │     │
│  │ Onboarding     │  │ Validation     │  │ Assignment     │     │
│  └───────┬────────┘  └───────┬────────┘  └───────┬────────┘     │
│          │                   │                   │               │
│          v                   v                   v               │
│  ┌────────────────────────────────────────────────────────┐     │
│  │              Audit Trail & Traceability                │     │
│  └────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────┘
```

---

## 6. IT / Security Engineer Dashboard

### 6.1 Purpose

The IT/Security Dashboard provides dedicated cybersecurity management:

- Monitor authentication and access events
- Detect and analyze security threats
- Manage security incidents
- Access SIEM and log analytics

> **Critical:** This dashboard is **completely isolated** from business administration functions.

### 6.2 Key Features and Actions

#### 6.2.1 Authentication Monitoring

| Event Type | Description | Severity Levels |
|------------|-------------|-----------------|
| `login_success` | Successful authentication | Low |
| `login_failure` | Failed authentication attempt | Medium |
| `logout` | User session termination | Low |
| `password_change` | Password modification | Medium |
| `mfa_enabled` | Two-factor activation | Low |
| `mfa_disabled` | Two-factor deactivation | High |
| `suspicious_activity` | Anomalous behavior detected | High/Critical |
| `access_denied` | Unauthorized access attempt | Medium |
| `session_expired` | Session timeout | Low |
| `ip_blocked` | IP address blocked | High |

#### 6.2.2 Threat Detection & Analysis

**Threat Categories:**
- Brute-force attacks
- Credential stuffing
- Session hijacking attempts
- Privilege escalation
- Data exfiltration attempts

**Severity Classification:**
```
┌──────────┬─────────────────────────────────────────────────────┐
│ Severity │ Description                                         │
├──────────┼─────────────────────────────────────────────────────┤
│ Low      │ Informational events, no immediate action required  │
│ Medium   │ Potential security concern, monitoring recommended  │
│ High     │ Active threat, investigation required               │
│ Critical │ Immediate response required, system at risk         │
└──────────┴─────────────────────────────────────────────────────┘
```

#### 6.2.3 SIEM Dashboard

| Component | Function |
|-----------|----------|
| **Log Aggregation** | Centralized collection of all system logs |
| **Event Correlation** | Link related security events across systems |
| **Alert Generation** | Automated alerts for threshold violations |
| **Trend Analysis** | Historical security pattern analysis |

#### 6.2.4 Incident Management

**Incident Lifecycle:**
```
Detection → Analysis → Containment → Eradication → Recovery → Lessons Learned
```

| Field | Description |
|-------|-------------|
| Incident ID | Unique identifier |
| Detected At | Timestamp of detection |
| Severity | Low/Medium/High/Critical |
| Status | Active/Investigating/Resolved |
| Affected System | Impacted component |
| Actions Taken | Response measures |

### 6.3 Permissions & Restrictions

#### Authorized Actions
- ✅ View all authentication logs
- ✅ Analyze security events
- ✅ Access SIEM dashboards
- ✅ Manage security incidents
- ✅ View firewall and IDS/IPS logs
- ✅ Generate security reports
- ✅ Configure security alerts

#### Restricted Actions
- ❌ Manage reimbursements
- ❌ Validate documents
- ❌ Manage users or prestataires
- ❌ Access functional administration
- ❌ Modify user roles (except security-related)

### 6.4 Security Tools Access

```
┌─────────────────────────────────────────────────────────────────┐
│                    IT/Security Tool Stack                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  SIEM       │  │  IDS/IPS    │  │  Firewall   │             │
│  │  Dashboard  │  │  Logs       │  │  Logs       │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  Auth       │  │  Threat     │  │  Incident   │             │
│  │  Monitor    │  │  Intel      │  │  Tracker    │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Cross-Dashboard Interactions

### 7.1 Workflow Dependencies

#### User Account Activation Flow
```
┌──────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────┐
│   User   │ -> │   Pending    │ -> │  Admin Sup  │ -> │  Active  │
│ Register │    │   Account    │    │  Approval   │    │  User    │
└──────────┘    └──────────────┘    └─────────────┘    └──────────┘
                       │                   │
                       v                   v
                ┌──────────────┐    ┌─────────────┐
                │ Notification │    │ Notification│
                │   to Admin   │    │   to User   │
                └──────────────┘    └─────────────┘
```

#### Reimbursement Processing Flow
```
┌──────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────┐
│   User   │ -> │   Submit     │ -> │Admin Normal │ -> │  Status  │
│ Submits  │    │   Request    │    │  Reviews    │    │  Update  │
└──────────┘    └──────────────┘    └─────────────┘    └──────────┘
                                           │
                                           v
                                    ┌─────────────┐
                                    │ Approve or  │
                                    │   Reject    │
                                    └─────────────┘
```

### 7.2 Notification Matrix

| Event | Notified Roles |
|-------|----------------|
| New User Registration | Admin Sup |
| New Prestataire Registration | Admin Sup |
| Document Submitted | Admin Normal, Admin Sup |
| Reimbursement Submitted | Admin Normal, Admin Sup |
| Account Approved | User/Prestataire |
| Account Rejected | User/Prestataire |
| Security Alert (Medium+) | IT/Security |
| Security Alert (Critical) | IT/Security, Admin Sup |

### 7.3 Audit Trail Integration

Every critical action generates an audit entry accessible to authorized roles:

| Action Category | Audit Fields |
|-----------------|--------------|
| Account Management | user_id, action, timestamp, performed_by |
| Document Operations | document_id, action, timestamp, user_id |
| Reimbursement Processing | reimbursement_id, action, amount, timestamp |
| Security Events | event_type, severity, ip_address, user_agent |

---

## 8. Security Architecture

### 8.1 Authentication Framework

#### 8.1.1 Standard Authentication
```
┌─────────────────────────────────────────────────────────────────┐
│                    Authentication Flow                           │
├─────────────────────────────────────────────────────────────────┤
│  1. User submits email + password                                │
│  2. System validates credentials                                 │
│  3. If Admin: Require TOTP verification                          │
│  4. Check password expiry (30-day policy)                        │
│  5. Generate JWT session token                                   │
│  6. Log security event                                           │
└─────────────────────────────────────────────────────────────────┘
```

#### 8.1.2 Two-Factor Authentication (Admins Only)

| Component | Description |
|-----------|-------------|
| **TOTP Setup** | QR code generation for authenticator apps |
| **Verification** | 6-digit code with ±2 time step tolerance |
| **Recovery** | Admin Sup can reset via `reset-totp-admin` function |
| **Enforcement** | Required on every admin login |

#### 8.1.3 Password Policy

| Requirement | Value |
|-------------|-------|
| Minimum Length | 12 characters |
| Uppercase Required | Yes |
| Lowercase Required | Yes |
| Numbers Required | Yes |
| Special Characters | Yes |
| Expiry Period | 30 days |
| History Check | Last 5 passwords |

### 8.2 Access Control Model

#### 8.2.1 Role-Based Access Control (RBAC)

```
┌─────────────────────────────────────────────────────────────────┐
│                         RBAC Hierarchy                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Admin Sup (Owner)                     │    │
│  │           Full governance and approval authority         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│              ┌───────────────┼───────────────┐                  │
│              v               v               v                   │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐       │
│  │ Admin Normal  │  │  IT/Security  │  │   Validator   │       │
│  │  Operations   │  │   Security    │  │   Documents   │       │
│  └───────────────┘  └───────────────┘  └───────────────┘       │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                 User / Prestataire                       │    │
│  │              Limited to personal data                    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### 8.2.2 Row Level Security (RLS)

| Table | Policy Type | Access Rule |
|-------|-------------|-------------|
| `profiles` | PERMISSIVE + RESTRICTIVE | Authenticated users filtered by role |
| `insured_members` | PERMISSIVE + RESTRICTIVE | Admin/Agent access only |
| `reimbursements` | RESTRICTIVE | Owner or Admin access |
| `documents` | RESTRICTIVE | Owner or Admin access |
| `security_events` | RESTRICTIVE | IT/Security role only |

### 8.3 Data Protection

#### 8.3.1 Sensitive Data Handling

| Data Type | Protection Method |
|-----------|-------------------|
| Passwords | bcrypt hashing (Supabase Auth) |
| MFA Secrets | Column-level access restriction |
| OTP Codes | Short-lived, attempt-limited |
| Session Tokens | JWT with automatic expiration |

#### 8.3.2 Column-Level Access Control

The `user_security_settings` table implements strict column-level security:

```sql
-- Sensitive columns (server-side only):
-- mfa_secret, otp_code, otp_expires_at, otp_attempts

-- Public columns (client accessible):
-- mfa_status, last_login_at, password_must_change
```

### 8.4 Security Principles Implementation

#### Defense-in-Depth
- Multiple authentication layers (password + TOTP)
- Role-based + Row-level security
- Network-level protections (rate limiting)
- Application-level validations

#### Zero Trust
- No implicit trust for any user
- Continuous verification on each request
- Session validation on every API call
- IP-based anomaly detection

#### Least Privilege
- Minimum permissions per role
- Feature access based on role requirements
- No shared admin accounts
- Temporary elevated access when needed

#### Audit & Traceability
- All actions logged with timestamps
- User agent and IP recording
- Comprehensive audit_logs table
- Security event correlation

---

## 9. Appendices

### 9.1 Role Permission Matrix

| Feature | User | Prestataire | Admin Normal | Admin Sup | IT/Security |
|---------|------|-------------|--------------|-----------|-------------|
| View Personal Profile | ✅ | ✅ | ✅ | ✅ | ✅ |
| Upload Documents | ✅ | ✅ | ❌ | ❌ | ❌ |
| Submit Reimbursements | ✅ | ❌ | ❌ | ❌ | ❌ |
| Validate Documents | ❌ | ❌ | ✅ | ✅ | ❌ |
| Approve Reimbursements | ❌ | ❌ | ✅ | ✅ | ❌ |
| Manage Events | ❌ | ❌ | ✅ | ✅ | ❌ |
| Generate Reports | ❌ | ❌ | ✅ | ✅ | ✅ |
| Validate Accounts | ❌ | ❌ | ❌ | ✅ | ❌ |
| Manage Employees | ❌ | ❌ | ❌ | ✅ | ❌ |
| Assign Roles | ❌ | ❌ | ❌ | ✅ | ❌ |
| View Security Logs | ❌ | ❌ | ❌ | ⚠️ | ✅ |
| Manage Incidents | ❌ | ❌ | ❌ | ❌ | ✅ |
| Access SIEM | ❌ | ❌ | ❌ | ❌ | ✅ |

*Legend: ✅ Full Access | ⚠️ Limited Access | ❌ No Access*

### 9.2 Status Definitions

#### Account Status
| Status | Description |
|--------|-------------|
| **Pending** | Awaiting Admin Sup validation |
| **Active** | Fully operational account |
| **Suspended** | Temporarily disabled |
| **Rejected** | Registration denied |

#### Document Status
| Status | Description |
|--------|-------------|
| **Pending** | Awaiting review |
| **Approved** | Validated and accepted |
| **Rejected** | Declined with reason |
| **Expired** | Past validity date |

#### Reimbursement Status
| Status | Description |
|--------|-------------|
| **En attente** | Submitted, awaiting processing |
| **En traitement** | Under active review |
| **Approuvé** | Accepted for payment |
| **Rejeté** | Declined with reason |

### 9.3 Glossary

| Term | Definition |
|------|------------|
| **Assuré** | CNAM beneficiary/insured person |
| **Prestataire** | Healthcare service provider |
| **Admin Sup** | Super Administrator with Owner privileges |
| **RLS** | Row Level Security - PostgreSQL access control |
| **TOTP** | Time-based One-Time Password |
| **SIEM** | Security Information and Event Management |
| **IDS/IPS** | Intrusion Detection/Prevention System |

### 9.4 Contact Information

| Role | Contact | Responsibility |
|------|---------|----------------|
| Admin Sup (Owner) | ranime.jemal@esprim.tn | Governance & Approvals |
| IT Support | [IT Support Email] | Technical Issues |
| Security Team | [Security Email] | Security Incidents |

---

**Document Control:**
- Created: February 2026
- Author: System Documentation Team
- Review Cycle: Quarterly
- Next Review: May 2026

---

*This document is confidential and intended for internal use only. Unauthorized distribution is prohibited.*
