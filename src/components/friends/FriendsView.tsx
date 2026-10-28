import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Input } from '../common/Input';
import { EmptyState } from '../common/EmptyState';
import { ConfirmModal } from '../common/ConfirmModal';
import {
  Users,
  Search,
  UserPlus,
  UserCheck,
  UserX,
  Clock,
  Shield,
  Check,
  X,
  AlertCircle,
  Phone,
  PhoneCall,
  MessageSquare,
  RefreshCw,
  Lock,
  Sparkles,
} from 'lucide-react';
import {
  apiSearchFriends,
  apiSendFriendRequest,
  apiGetFriends,
  apiGetFriendRequests,
  apiAcceptFriendRequest,
  apiDeclineFriendRequest,
  apiCancelFriendRequest,
  apiRemoveFriend,
  apiBlockUser,
  apiUnblockUser,
  apiGetBlockedUsers,
  apiGetUnreadMessageCounts,
} from '../../api';
import {
  FriendSearchResult,
  FriendItem,
  FriendRequestItem,
  BlockedUserItem,
} from '../../types';
import { formatDate } from '../../utils/formatters';
import { FriendChatView } from './FriendChatView';
import { useCall } from '../../context/CallContext';
import { getSocket } from '../../utils/socket';
import { getCallingSetupState } from '../../utils/callingPermissions';

type TabMode = 'friends' | 'requests' | 'search' | 'blocked';

export const FriendsView: React.FC = () => {
  const { showToast, refreshFriendsCount, currentUser } = useApp();
  const { startCall, openCallingSetup } = useCall();

  // One-time calling setup check before user makes or receives their first call
  useEffect(() => {
    if (getCallingSetupState() === 'none') {
      openCallingSetup();
    }
  }, [openCallingSetup]);

  const [activeTab, setActiveTab] = useState<TabMode>('friends');
  const [loading, setLoading] = useState(false);

  // Active 1-to-1 Chat Conversation
  const [activeChatFriend, setActiveChatFriend] = useState<FriendItem | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<FriendSearchResult | null>(null);

  // Lists
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequestItem[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequestItem[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUserItem[]>([]);

  // Confirmation Modals
  const [friendToRemove, setFriendToRemove] = useState<FriendItem | null>(null);
  const [userToBlock, setUserToBlock] = useState<{ id: string; name: string } | null>(null);

  // Fetch all friend data & unread counts
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [friendsRes, requestsRes, blockedRes, unreadRes] = await Promise.all([
        apiGetFriends().catch(() => ({ friends: [] })),
        apiGetFriendRequests().catch(() => ({ incoming: [], outgoing: [], totalPendingIncoming: 0 })),
        apiGetBlockedUsers().catch(() => ({ blockedUsers: [] })),
        apiGetUnreadMessageCounts().catch(() => ({ unreadByFriend: {}, totalUnread: 0 })),
      ]);

      setFriends(friendsRes.friends || []);
      setIncomingRequests(requestsRes.incoming || []);
      setOutgoingRequests(requestsRes.outgoing || []);
      setBlockedUsers(blockedRes.blockedUsers || []);
      setUnreadCounts(unreadRes.unreadByFriend || {});
      refreshFriendsCount();
    } catch {
      showToast('Failed to load friends network data.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, refreshFriendsCount]);

  // Listen for real-time messages to increment unread counter
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewMessage = (msg: any) => {
      if (activeChatFriend?.id !== msg.senderId) {
        setUnreadCounts((prev) => ({
          ...prev,
          [msg.senderId]: (prev[msg.senderId] || 0) + 1,
        }));
      }
    };

    socket.on('message:new', handleNewMessage);
    return () => {
      socket.off('message:new', handleNewMessage);
    };
  }, [activeChatFriend]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle account search (by exact phone or exact full name)
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      showToast('Please enter a phone number or full name to search.', 'warning');
      return;
    }

    setSearchLoading(true);
    setSearchResult(null);
    try {
      const res = await apiSearchFriends(searchQuery.trim());
      setSearchResult(res);
      if (!res.found) {
        showToast(res.message || 'No registered DayLedger account found matching your search.', 'info');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Search failed';
      showToast(msg, 'error');
    } finally {
      setSearchLoading(false);
    }
  };

  // Handle send request
  const handleSendRequest = async (recipientId: string) => {
    try {
      const res = await apiSendFriendRequest(recipientId);
      showToast(res.message || 'Friend request sent!', 'success');
      // Update search result status across all matching profiles
      if (searchResult) {
        setSearchResult({
          ...searchResult,
          user: searchResult.user?.id === recipientId
            ? { ...searchResult.user, friendshipStatus: 'pending_sent' }
            : searchResult.user,
          users: searchResult.users?.map((u) =>
            u.id === recipientId ? { ...u, friendshipStatus: 'pending_sent' } : u
          ),
        });
      }
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send request.';
      showToast(msg, 'error');
    }
  };

  // Handle Accept
  const handleAccept = async (requestId: string) => {
    try {
      const res = await apiAcceptFriendRequest(requestId);
      showToast(res.message || 'Friend request accepted!', 'success');
      loadData();
      if (searchResult) {
        setSearchResult({
          ...searchResult,
          user: searchResult.user?.friendshipId === requestId
            ? { ...searchResult.user, friendshipStatus: 'friends' }
            : searchResult.user,
          users: searchResult.users?.map((u) =>
            u.friendshipId === requestId ? { ...u, friendshipStatus: 'friends' } : u
          ),
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to accept request.';
      showToast(msg, 'error');
    }
  };

  // Handle Decline
  const handleDecline = async (requestId: string) => {
    try {
      const res = await apiDeclineFriendRequest(requestId);
      showToast(res.message || 'Friend request declined.', 'info');
      loadData();
      if (searchResult) {
        setSearchResult({
          ...searchResult,
          user: searchResult.user?.friendshipId === requestId
            ? { ...searchResult.user, friendshipStatus: 'none', friendshipId: null }
            : searchResult.user,
          users: searchResult.users?.map((u) =>
            u.friendshipId === requestId ? { ...u, friendshipStatus: 'none', friendshipId: null } : u
          ),
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to decline request.';
      showToast(msg, 'error');
    }
  };

  // Handle Cancel Outgoing Request
  const handleCancelRequest = async (requestId: string) => {
    try {
      const res = await apiCancelFriendRequest(requestId);
      showToast(res.message || 'Request cancelled.', 'info');
      loadData();
      if (searchResult) {
        setSearchResult({
          ...searchResult,
          user: searchResult.user?.friendshipId === requestId
            ? { ...searchResult.user, friendshipStatus: 'none', friendshipId: null }
            : searchResult.user,
          users: searchResult.users?.map((u) =>
            u.friendshipId === requestId ? { ...u, friendshipStatus: 'none', friendshipId: null } : u
          ),
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to cancel request.';
      showToast(msg, 'error');
    }
  };

  // Handle Unfriend
  const confirmRemoveFriend = async () => {
    if (!friendToRemove) return;
    try {
      await apiRemoveFriend(friendToRemove.friendshipId);
      showToast(`${friendToRemove.name} removed from your friends list.`, 'info');
      setFriendToRemove(null);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to remove friend.';
      showToast(msg, 'error');
    }
  };

  // Handle Block
  const confirmBlockUser = async () => {
    if (!userToBlock) return;
    try {
      await apiBlockUser(userToBlock.id);
      showToast(`${userToBlock.name} has been blocked.`, 'warning');
      setUserToBlock(null);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to block user.';
      showToast(msg, 'error');
    }
  };

  // Handle Unblock
  const handleUnblock = async (userId: string, userName: string) => {
    try {
      await apiUnblockUser(userId);
      showToast(`${userName} unblocked.`, 'success');
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to unblock user.';
      showToast(msg, 'error');
    }
  };

  if (activeChatFriend) {
    return (
      <div className="space-y-4">
        <FriendChatView
          friend={activeChatFriend}
          onBack={() => {
            setActiveChatFriend(null);
            loadData();
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>Friends</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Connect with DayLedger users, manage friend requests, and maintain your privacy.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setActiveTab('search')}
            icon={<UserPlus className="w-3.5 h-3.5" />}
          >
            Find Friends
          </Button>
        </div>
      </div>

      {/* Navigation Pills */}
      <div className="flex items-center gap-1.5 border-b border-zinc-200 dark:border-zinc-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('friends')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'friends'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>My Friends</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === 'friends'
                ? 'bg-indigo-500/80 text-white'
                : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            {friends.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'requests'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Friend Requests</span>
          {incomingRequests.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-rose-500 text-white animate-pulse">
              {incomingRequests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('search')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'search'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Find Friends</span>
        </button>

        <button
          onClick={() => setActiveTab('blocked')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'blocked'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Blocked ({blockedUsers.length})</span>
        </button>
      </div>

      {/* ==================== TAB: FIND FRIENDS ==================== */}
      {activeTab === 'search' && (
        <div className="space-y-4 max-w-2xl">
          <Card className="p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <Search className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Search Accounts
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Search existing DayLedger accounts by exact normalized phone number or exact full name.
                </p>
              </div>
            </div>

            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2 mt-4">
              <div className="flex-1">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter exact phone number (e.g. +91 98765 43210) or exact full name..."
                  required
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                loading={searchLoading}
                icon={<Search className="w-4 h-4" />}
                className="shrink-0"
              >
                Search
              </Button>
            </form>

            <div className="rounded-lg p-3 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 mt-4 text-[11px] text-zinc-500 dark:text-zinc-400 flex items-start gap-2">
              <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-zinc-400" />
              <span>
                <strong>Zero spam guarantee:</strong> Phone numbers and email addresses are never displayed. Friend requests are sent only to existing accounts and remain pending until accepted or rejected.
              </span>
            </div>
          </Card>

          {/* Search Results Display */}
          {searchResult && (
            <div>
              {searchResult.found ? (
                (() => {
                  const resultsList = searchResult.users && searchResult.users.length > 0
                    ? searchResult.users
                    : (searchResult.user ? [searchResult.user] : []);

                  if (resultsList.length === 0) {
                    return (
                      <Card className="p-6 text-center">
                        <div className="mx-auto w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 mb-2">
                          <Search className="w-5 h-5" />
                        </div>
                        <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          No Matching Account
                        </h4>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
                          {searchResult.message || 'No DayLedger account was found matching this phone number or full name.'}
                        </p>
                      </Card>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      {resultsList.length > 1 && (
                        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-900/40 text-xs font-semibold text-indigo-900 dark:text-indigo-300">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span>Found {resultsList.length} matching accounts. Choose the profile you want to connect with:</span>
                        </div>
                      )}
                      {resultsList.map((matchedUser) => (
                        <Card key={matchedUser.id} className="p-4 border-indigo-200/80 dark:border-indigo-900/50">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-600 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                                {matchedUser.avatarSeed?.substring(0, 2).toUpperCase() || 'U'}
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                  {matchedUser.name}
                                </h4>
                                <p className="text-xs text-zinc-400">DayLedger Member</p>
                              </div>
                            </div>

                            <div className="shrink-0">
                              {matchedUser.friendshipStatus === 'friends' && (
                                <Badge variant="success">Already Friends</Badge>
                              )}

                              {matchedUser.friendshipStatus === 'pending_sent' && (
                                <div className="flex items-center gap-2">
                                  <Badge variant="warning">Request Pending</Badge>
                                  {matchedUser.friendshipId && (
                                    <Button
                                      variant="outline"
                                      size="xs"
                                      onClick={() => handleCancelRequest(matchedUser.friendshipId!)}
                                    >
                                      Cancel
                                    </Button>
                                  )}
                                </div>
                              )}

                              {matchedUser.friendshipStatus === 'pending_received' && (
                                <div className="flex items-center gap-1.5">
                                  <Button
                                    variant="primary"
                                    size="xs"
                                    onClick={() => matchedUser.friendshipId && handleAccept(matchedUser.friendshipId)}
                                  >
                                    Accept
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="xs"
                                    onClick={() => matchedUser.friendshipId && handleDecline(matchedUser.friendshipId)}
                                  >
                                    Decline
                                  </Button>
                                </div>
                              )}

                              {matchedUser.friendshipStatus === 'none' && (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleSendRequest(matchedUser.id)}
                                  icon={<UserPlus className="w-3.5 h-3.5" />}
                                >
                                  Add Friend
                                </Button>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  );
                })()
              ) : (
                <Card className="p-6 text-center">
                  <div className="mx-auto w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 mb-2">
                    <Search className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    No Matching Account
                  </h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
                    {searchResult.message || 'No DayLedger account was found matching this phone number or full name.'}
                  </p>
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB: FRIEND REQUESTS ==================== */}
      {activeTab === 'requests' && (
        <div className="space-y-6">
          {/* Incoming Requests */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
                Incoming Requests ({incomingRequests.length})
              </h3>
            </div>

            {incomingRequests.length === 0 ? (
              <Card className="p-6 text-center">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  No incoming friend requests awaiting your approval.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {incomingRequests.map((req) => (
                  <Card key={req.id} className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center text-sm shrink-0">
                        {req.avatarSeed?.substring(0, 2).toUpperCase() || 'U'}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                          {req.name}
                        </h4>
                        <p className="text-[11px] text-zinc-400 truncate">
                          Sent {formatDate(req.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        variant="primary"
                        size="xs"
                        onClick={() => handleAccept(req.id)}
                        icon={<Check className="w-3.5 h-3.5" />}
                      >
                        Accept
                      </Button>
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => handleDecline(req.id)}
                        icon={<X className="w-3.5 h-3.5" />}
                      >
                        Decline
                      </Button>
                      <button
                        onClick={() => req.requesterId && setUserToBlock({ id: req.requesterId, name: req.name })}
                        className="p-1.5 text-zinc-400 hover:text-rose-600 rounded"
                        title="Block User"
                      >
                        <Shield className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Outgoing Requests */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
                Sent Requests ({outgoingRequests.length})
              </h3>
            </div>

            {outgoingRequests.length === 0 ? (
              <Card className="p-6 text-center">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  No outgoing requests pending acceptance.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {outgoingRequests.map((req) => (
                  <Card key={req.id} className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold flex items-center justify-center text-sm shrink-0">
                        {req.avatarSeed?.substring(0, 2).toUpperCase() || 'U'}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                          {req.name}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge size="xs" variant="warning">Pending Acceptance</Badge>
                          <span className="text-[10px] text-zinc-400">{formatDate(req.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => handleCancelRequest(req.id)}
                    >
                      Cancel
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== TAB: MY FRIENDS ==================== */}
      {activeTab === 'friends' && (
        <div>
          {friends.length === 0 ? (
            <EmptyState
              title="No Friends Added Yet"
              description="Connect with friends using their verified phone number. Once accepted, you'll be able to communicate directly."
              actionLabel="Find Friends by Phone"
              onAction={() => setActiveTab('search')}
              icon={<Users className="w-10 h-10 text-indigo-500" />}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {friends.map((friend) => (
                <Card key={friend.id} className="p-4 flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                        {friend.avatarSeed?.substring(0, 2).toUpperCase() || 'U'}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                          {friend.name}
                        </h4>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          Friends since {formatDate(friend.since || '')}
                        </p>
                      </div>
                    </div>

                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 mt-1" title="Connected friend" />
                  </div>

                  {/* Messaging & Calling Actions */}
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                    <Button
                      size="sm"
                      variant="primary"
                      className="flex-1"
                      icon={<MessageSquare className="w-3.5 h-3.5" />}
                      onClick={() => setActiveChatFriend(friend)}
                    >
                      <span>Message</span>
                      {unreadCounts[friend.id] > 0 && (
                        <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-white text-indigo-700 text-[10px] font-bold">
                          {unreadCounts[friend.id]}
                        </span>
                      )}
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      icon={<PhoneCall className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                      onClick={() => startCall(friend.id, friend.name, friend.avatarSeed)}
                      title="Audio Call"
                    />

                    <button
                      onClick={() => setFriendToRemove(friend)}
                      className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                      title="Unfriend"
                    >
                      <UserX className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setUserToBlock({ id: friend.id, name: friend.name })}
                      className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors"
                      title="Block user"
                    >
                      <Shield className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB: BLOCKED USERS ==================== */}
      {activeTab === 'blocked' && (
        <div className="space-y-4 max-w-2xl">
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
              Blocked Users ({blockedUsers.length})
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
              Blocked users cannot find your account, send friend requests, or contact you on DayLedger.
            </p>

            {blockedUsers.length === 0 ? (
              <p className="text-xs text-zinc-400 py-4 text-center">No blocked users.</p>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {blockedUsers.map((user) => (
                  <div key={user.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold flex items-center justify-center text-xs">
                        {user.avatarSeed?.substring(0, 2).toUpperCase() || 'U'}
                      </div>
                      <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                        {user.name}
                      </span>
                    </div>

                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => handleUnblock(user.id, user.name)}
                    >
                      Unblock
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Unfriend Confirm Modal */}
      <ConfirmModal
        isOpen={Boolean(friendToRemove)}
        onClose={() => setFriendToRemove(null)}
        onConfirm={confirmRemoveFriend}
        title="Remove Friend"
        message={`Are you sure you want to remove ${friendToRemove?.name} from your friends list?`}
        confirmLabel="Remove Friend"
        variant="danger"
      />

      {/* Block Confirm Modal */}
      <ConfirmModal
        isOpen={Boolean(userToBlock)}
        onClose={() => setUserToBlock(null)}
        onConfirm={confirmBlockUser}
        title="Block User"
        message={`Are you sure you want to block ${userToBlock?.name}? They will not be able to find your profile or send you friend requests.`}
        confirmLabel="Block User"
        variant="danger"
      />
    </div>
  );
};
