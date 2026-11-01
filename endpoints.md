# Veiled API Endpoints

Base URL: `https://veiled.lol/api/v1`

Bot endpoints use:

```http
Authorization: Bot <applicationId>.<secret>
```

The allowlist rejects other API routes for bot tokens. Command registration, OAuth consent, and actions performed by a signed-in user use a Veiled user session instead; those endpoint notes call this out.

```bash
curl https://veiled.lol/api/v1/bots/@me \
  -H "Authorization: Bot $VEILED_BOT_TOKEN"
```

## Bot

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/bots/@me` | The bot user and its application. |
| `GET` | `/bots/@me/rooms` | Rooms the bot is installed in, with granted permissions. |
| `GET` | `/bots/gateway` | The gateway URL. |
| `DELETE` | `/bots/@me/rooms/:roomId` | Leave a room. |

## Rooms

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/rooms/:roomId` | Room details. |
| `GET` | `/rooms/:roomId/lanes` | Channels (lanes) in a room. |
| `GET` | `/lanes/:laneId/capabilities` | Return the caller's effective lane permissions, slowmode state, next send time, and character limit. View Channel permission required. |
| `GET` | `/rooms/:roomId/members` | Room members. |
| `GET` | `/rooms/:roomId/roles` | Roles in the room. |
| `GET` | `/rooms/:roomId/roles/:roleId/members` | Members assigned to a role. |
| `GET` | `/rooms/:roomId/members/:userId/roles` | Roles assigned to a member. |
| `GET` | `/rooms/:roomId/members/:userId/permissions` | Effective room permissions for a member. |
| `GET` | `/rooms/:roomId/invites` | Invites for a room. |
| `GET` | `/invites/:code` | Look up an invite. |

## Messages

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/lanes/:laneId/messages` | Message history. |
| `POST` | `/lanes/:laneId/messages` | Send a message. Body: `{ content?, embeds?, components?, replyToId?, threadId? }`. |
| `POST` | `/lanes/:laneId/typing` | Show the typing indicator. |
| `PATCH` | `/messages/:messageId` | Edit a message the bot sent. Body: `{ content?, embeds?, components? }`. |
| `DELETE` | `/messages/:messageId` | Delete a message. |
| `POST` | `/messages/:messageId/reactions` | Add a reaction. |
| `DELETE` | `/messages/:messageId/reactions/:emoji` | Remove the bot's reaction. |
| `DELETE` | `/messages/:messageId/reactions/:emoji/users/:targetUserId` | Remove one user's reaction. Needs Manage Messages unless the user is the bot. |

## Roles and moderation

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/rooms/:roomId/roles` | Create a role. Requires the matching room permission and hierarchy checks. |
| `PATCH` | `/roles/:roleId` | Edit a role. |
| `DELETE` | `/roles/:roleId` | Delete a role. |
| `PUT` | `/rooms/:roomId/roles/reorder` | Change role positions. |
| `PUT` | `/rooms/:roomId/members/:userId/roles/:roleId` | Assign a role to a member. |
| `DELETE` | `/rooms/:roomId/members/:userId/roles/:roleId` | Remove a role from a member. |
| `DELETE` | `/rooms/:roomId/members/:userId` | Remove a member from a room. |
| `PUT` | `/rooms/:roomId/bans/:userId` | Ban a member. |
| `DELETE` | `/rooms/:roomId/bans/:userId` | Unban a member. |
| `POST` | `/rooms/:roomId/timeouts` | Apply a member timeout. |
| `DELETE` | `/rooms/:roomId/timeouts/:userId` | Remove a member timeout. |

## Threads

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/lanes/:laneId/threads` | List threads in a lane. |
| `GET` | `/rooms/:roomId/threads/joined` | List threads the bot has joined. |
| `POST` | `/lanes/:laneId/threads` | Create a thread from a lane. |
| `GET` | `/threads/:threadId` | Get thread details. |
| `GET` | `/threads/:threadId/messages` | Read thread messages. |
| `GET` | `/threads/:threadId/members` | List thread members. |
| `POST` | `/threads/:threadId/messages` | Send a message to a thread. |
| `POST` | `/threads/:threadId/members` | Add a member to a thread. |
| `DELETE` | `/threads/:threadId/members/:userId` | Remove a member from a thread. |
| `POST` | `/threads/:threadId/archive` | Archive a thread. |
| `POST` | `/threads/:threadId/unarchive` | Unarchive a thread. |
| `POST` | `/threads/:threadId/lock` | Lock a thread. |
| `POST` | `/threads/:threadId/unlock` | Unlock a thread. |
| `POST` | `/threads/:threadId/pin` | Pin a thread. |
| `POST` | `/threads/:threadId/publish` | Publish a thread. |
| `PATCH` | `/threads/:threadId` | Update thread settings. |
| `DELETE` | `/threads/:threadId` | Delete a thread. |

## Invites and scheduled events

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/rooms/:roomId/invites` | Create a room invite. |
| `PATCH` | `/invites/:code` | Edit an invite. |
| `DELETE` | `/invites/:code` | Revoke an invite. |
| `GET` | `/rooms/:roomId/events` | List scheduled events in a room. |
| `GET` | `/events/:eventId` | Get a scheduled event. |
| `POST` | `/rooms/:roomId/events` | Create a scheduled event. |
| `PATCH` | `/events/:eventId` | Update a scheduled event. |
| `DELETE` | `/events/:eventId` | Cancel a scheduled event. |
| `PUT` | `/events/:eventId/rsvp` | Add an RSVP. |
| `DELETE` | `/events/:eventId/rsvp` | Remove an RSVP. |

## Webhooks

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/lanes/:laneId/webhooks` | List webhooks in a lane. |
| `POST` | `/lanes/:laneId/webhooks` | Create a webhook in a lane. |
| `GET` | `/webhooks/:webhookId` | Get webhook settings. |
| `PATCH` | `/webhooks/:webhookId` | Update webhook settings. |
| `POST` | `/webhooks/:webhookId/token` | Rotate the webhook token. |
| `DELETE` | `/webhooks/:webhookId` | Delete a webhook. |

## Application commands

These require the application owner's Veiled user session, unless noted otherwise.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/applications/:applicationId/commands` | List commands for an application. Bot tokens cannot manage command definitions. Add `?roomId=:roomId` for room-scoped commands. |
| `PUT` | `/applications/:applicationId/commands` | Replace the application's command definitions. Supports chat-input, user, and message command types. |
| `DELETE` | `/applications/:applicationId/commands/:commandId` | Delete a command definition. |
| `GET` | `/applications/:applicationId/privileged-intents` | View the application's privileged intent approval state. |
| `POST` | `/applications/:applicationId/privileged-intents/request` | Request `MESSAGE_CONTENT`, `MEMBERS`, or `PRESENCE` access with a reason. Staff review is required. |
| `DELETE` | `/applications/:applicationId/privileged-intents/request` | Cancel the pending privileged intent request. |
| `GET` | `/lanes/:laneId/application-commands` | List installed commands visible to the signed-in user. Requires a user session and Use Application Commands permission. |
| `POST` | `/lanes/:laneId/application-commands/:commandId/autocomplete` | Request autocomplete choices. The installed bot receives `INTERACTION_CREATE` and has a short response window. User session required. |
| `POST` | `/lanes/:laneId/application-commands/:commandId/invoke` | Invoke a chat-input, user, or message command. User session required; the installed bot receives `INTERACTION_CREATE`. |

## Interactions

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/interactions/:interactionId/callback` | Acknowledge a component interaction with defer, reply, or update. Bot token required; replies and updates can include `stagedUploadIds`. |
| `POST` | `/interactions/commands/:interactionId/callback` | Respond to a slash-command or modal-submit interaction with defer, reply, autocomplete choices, or a modal. |
| `POST` | `/interactions/commands/:interactionId/modal-submit` | Submit the modal shown by a command. This is a signed-in user action; the bot receives a new `INTERACTION_CREATE` event. |
| `POST` | `/interactions/:interactionId/components` | Submit a control from an ephemeral reply that contains an interactive component. User session required; the bot receives a new component `INTERACTION_CREATE`. Current reply handlers do not permit creating interactive controls in ephemeral replies. |
| `GET` | `/interactions/:interactionId/attachments/:attachmentId/view` | View an ephemeral response attachment. User session and short-lived file token required; responses are private and expire. |
| `GET` | `/interactions/commands/:interactionId/attachments/:attachmentId` | Download a staged file selected for this bot's active command interaction. Bot token must match the interaction; the file must have been selected for that interaction and still be available. |

## Voice

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/lanes/:laneId/voice-states` | Members currently in a voice channel. |
| `POST` | `/voice/join` | Register the bot in a voice channel. Body: `{ laneId, sessionId }`. Media then goes through the gateway events `voice:join-sfu` and `voice:produce`. |
| `POST` | `/voice/leave` | Leave a voice channel. Body: `{ laneId }`. |
| `GET` | `/voice/ice-servers` | Get ICE server configuration (and its TTL) for WebRTC. Bots may pass `?laneId=:laneId`; the bot must be installed and have View Channel and Connect in that voice lane. |
| `GET` | `/voice/turn-credentials` | Get temporary TURN credentials. Uses the same optional `laneId` and installation/Connect checks as ICE server lookup. |

## Uploads

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/uploads/staged` | Upload a file before sending it. Use the returned staged upload ID in message or interaction `stagedUploadIds`; limits and attachment permissions still apply. |

## OAuth user authorization

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/oauth2/user/authorize` | Load the consent details for the signed-in user. The browser-facing consent page is `/oauth2/user/authorize`. |
| `POST` | `/oauth2/user/authorize` | Record the signed-in user's consent decision and return the redirect URL. A PKCE S256 challenge is required. |
| `POST` | `/oauth2/token` | Exchange a one-time authorization code or rotate a refresh token. Confidential clients use HTTP Basic; public clients send `client_id` and use PKCE without a secret. |
| `POST` | `/oauth2/revoke` | Revoke a token using the same confidential or public client authentication as the token endpoint. |
| `GET` | `/oauth2/userinfo` | Use a Bearer access token to return identify claims and, when granted and verified, email claims. |
| `GET` | `/oauth2/user/authorized-apps` | List active authorizations for the signed-in user. Veiled user session required. |
| `DELETE` | `/oauth2/user/authorized-apps/:grantId` | Revoke one of the signed-in user's authorizations. Veiled user session required. |

User scopes are `identify` and `email`; `identify` is required. Redirect URIs must exactly match a registered HTTPS URI, or a localhost HTTP URI for development. Authorization uses a one-time code with S256 PKCE.

```js
// Send the user's browser to https://veiled.lol/oauth2/user/authorize with:
// response_type=code, client_id, exact registered redirect_uri, scope=identify,
// random state, code_challenge=<base64url(SHA256(code_verifier))>,
// and code_challenge_method=S256.
// This page uses the signed-in user's session to show consent. It calls the API
// at /api/v1/oauth2/user/authorize and returns the code to your redirect URI.

// After the user consents, exchange the returned one-time code:
const tokens = await fetch(API + '/oauth2/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    grant_type: 'authorization_code',
    client_id: CLIENT_ID, // public client only; confidential clients use HTTP Basic auth
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier,
  }),
}).then((response) => response.json());
```

## Gateway

Gateway connection details and event names live in [`gateway.md`](./gateway.md).
