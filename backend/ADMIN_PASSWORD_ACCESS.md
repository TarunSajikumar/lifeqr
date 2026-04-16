# Admin Routes for Password Management

## Overview
The admin routes provide functionality for administrators to view user passwords (both encrypted and decrypted) to assist customers who have forgotten their passwords.

## Security Warning
⚠️ **IMPORTANT**: Storing plain text passwords is a significant security risk. This implementation is provided as requested but should not be used in production without proper security measures.

## Routes

### GET /api/admin/users
Retrieves all users with their password information.

**Authentication**: Requires JWT token (currently any authenticated user)

**Response**:
```json
{
  "success": true,
  "users": [
    {
      "id": "user_id",
      "name": "User Name",
      "email": "user@example.com",
      "role": "patient",
      "encryptedPassword": "$2a$10$...",
      "decryptedPassword": "plaintext_password",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### GET /api/admin/users/:id
Retrieves a specific user by ID with password information.

**Authentication**: Requires JWT token

**Parameters**:
- `id`: User ID

**Response**: Same format as above but for a single user.

## Implementation Details

- Passwords are stored in two fields: `password` (bcrypt hashed) and `plainPassword` (plain text)
- New registrations store both versions
- Existing users have been migrated with placeholder plain passwords
- Public routes exclude password fields for security
- Admin routes require authentication

## Recommendations

1. **Restrict Admin Access**: Modify `authenticateAdmin` middleware to check for admin role
2. **Audit Logging**: Log all admin password access
3. **Password Reset Flow**: Implement proper password reset instead of showing passwords
4. **Encryption**: Consider encrypting the plainPassword field if storage is necessary