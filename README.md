* CNAM Admin Dashboard

A secure and modern administration dashboard designed for managing CNAM operations, with a strong focus on security, access control, and monitoring.

 *Overview

The CNAM Admin Dashboard allows authorized administrators to manage insured users, providers, reimbursements, documents, and system monitoring through a centralized and secure interface.

Built with zero-trust principles, the platform integrates strong authentication, role-based access control, and security monitoring features.

* Key Features
* Authentication & Security

Secure login with email & password

Two-Factor Authentication (2FA) (Email OTP / Authenticator)

Role-based access control (Admin / Super Admin / Agent)

Zero Trust approach (no implicit trust)

Session management & auto logout

* Dashboard & Monitoring

Global KPIs (transactions, reimbursements, users)

Real-time system statistics

SIEM-like security dashboard

Login attempts

Suspicious activities

Security logs & alerts

Vulnerability indicators

* User & Entity Management

Manage insured users (CRUD)

Manage healthcare providers

Manage admin roles & permissions

Account activation / suspension

* Business Operations

Reimbursement processing (validate / reject)

Transaction history with filters

Document upload & verification

Reports generation (PDF / Excel)

* Audit & Compliance

Security logs (logins, actions)

Traceability of sensitive operations

Data protection & compliance-ready architecture

* Tech Stack

Frontend: React + TypeScript

UI: Tailwind CSS / shadcn-ui

Backend: Supabase

Authentication: Supabase Auth + 2FA

Database: PostgreSQL

Email Service: SMTP / Resend

Security: RBAC, Zero Trust, Logging



Getting Started
npm install
npm run dev


The application will be available at:

http://localhost:5173

* Access Control
Role	Permissions
Super Admin	Full system access, security & roles
Admin	Operational management
Agent	Limited read/write access



* Security Principles

Zero Trust Architecture

Least privilege access

Continuous monitoring

Auditability & traceability

Secure-by-design UI

* Project Scope

This dashboard is intended for:

Internal administration

Secure data management

Decision support & monitoring

Compliance-ready operations




* Portfolio: https://ranimejemalportfolio.vercel.app/
