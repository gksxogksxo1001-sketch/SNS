# Firestore Composite Indices Guide

This document lists the required composite indices for the SNS project to ensure all queries run efficiently and without errors.

## Required Indices

### `posts` Collection
| Field 1 | Field 2 | Order | Purpose |
| :--- | :--- | :--- | :--- |
| `groupId` | `createdAt` | `Descending` | Fetching group-specific posts ordered by time |
| `user.uid` | `createdAt` | `Descending` | Fetching a specific user's posts (Profile feed) |
| `likedBy` (Array) | `createdAt` | `Descending` | Fetching posts liked by a user (Likes tab) |
| `bookmarkedBy` (Array) | `createdAt` | `Descending` | Fetching posts saved by a user (Saved tab) |

### `chatRooms` Collection
| Field 1 | Field 2 | Order | Purpose |
| :--- | :--- | :--- | :--- |
| `participants` (Array) | `updatedAt` | `Descending` | Fetching user's chat list sorted by latest activity |

### `friendRequests` Collection (Optional but Recommended)
| Field 1 | Field 2 | Order | Purpose |
| :--- | :--- | :--- | :--- |
| `toUid` | `status` | `Ascending` | Fetching pending friend requests for a user |

---

## How to Create Indices

1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Select your project.
3. In the left sidebar, click **Firestore Database**.
4. Click the **Indices** tab at the top.
5. Click **Create Index**.
6. Enter the **Collection ID** (e.g., `posts`).
7. Add the fields and their sort order as listed in the table above.
8. Click **Create**.

> [!TIP]
> If you encounter a "Query requires an index" error in the browser console, Firebase usually provides a direct link in the error message. Clicking that link will pre-fill the index creation form for you.
