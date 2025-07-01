'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '@/services/admin-service';
import { formatDate } from '@/lib/utils';
import {
  Users,
  Search,
  Filter,
  Edit,
  Shield,
  UserCheck,
  UserX,
  CreditCard,
  Mail,
  Calendar,
  AlertCircle
} from 'lucide-react';

export default function AdminUsersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [editingUser, setEditingUser] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users', roleFilter],
    queryFn: () => adminService.getAllUsers(roleFilter || undefined),
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => adminService.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setEditingUser(null);
    },
  });

  const filteredUsers = users?.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (roleFilter === 'inactive') {
      return matchesSearch && !user.isActive;
    }
    
    return matchesSearch;
  }) || [];

  const getUserStatusColor = (user: any) => {
    if (!user.isActive) return 'bg-red-100 text-red-800';
    return 'bg-green-100 text-green-800';
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'merchant': return 'secondary';
      case 'customer': return 'default';
      default: return 'outline';
    }
  };

  const handleUpdateUser = (updates: any) => {
    if (editingUser) {
      updateUserMutation.mutate({
        id: editingUser.id,
        data: updates
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-8 h-8 text-primary" />
            <h1 className="text-2xl lg:text-3xl font-bold">User Management</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">Manage platform users and their settings</p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold">{users?.length || 0}</p>
                </div>
                <Users className="w-8 h-8 text-blue-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Customers</p>
                  <p className="text-2xl font-bold">{users?.filter(u => u.role === 'customer').length || 0}</p>
                </div>
                <UserCheck className="w-8 h-8 text-green-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Merchants</p>
                  <p className="text-2xl font-bold">{users?.filter(u => u.role === 'merchant').length || 0}</p>
                </div>
                <Shield className="w-8 h-8 text-purple-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Users</p>
                  <p className="text-2xl font-bold">{users?.filter(u => u.isActive).length || 0}</p>
                </div>
                <UserCheck className="w-8 h-8 text-orange-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={roleFilter === '' ? 'default' : 'outline'}
                  onClick={() => setRoleFilter('')}
                  size="sm"
                >
                  All
                </Button>
                <Button
                  variant={roleFilter === 'customer' ? 'default' : 'outline'}
                  onClick={() => setRoleFilter('customer')}
                  size="sm"
                >
                  Customers
                </Button>
                <Button
                  variant={roleFilter === 'merchant' ? 'default' : 'outline'}
                  onClick={() => setRoleFilter('merchant')}
                  size="sm"
                >
                  Merchants
                </Button>
                <Button
                  variant={roleFilter === 'admin' ? 'default' : 'outline'}
                  onClick={() => setRoleFilter('admin')}
                  size="sm"
                >
                  Admins
                </Button>
                <Button
                  variant={roleFilter === 'inactive' ? 'default' : 'outline'}
                  onClick={() => setRoleFilter('inactive')}
                  size="sm"
                >
                  Pending Approval
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Users ({filteredUsers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div>
                          <h3 className="font-semibold truncate">{user.name}</h3>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="w-4 h-4" />
                            <span className="truncate">{user.email}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {user.role}
                        </Badge>
                        <Badge className={getUserStatusColor(user)}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Calendar className="w-3 h-3" />
                          Joined {formatDate(user.createdAt)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      {user.role === 'customer' && (
                        <div className="text-sm">
                          <div className="flex items-center gap-1">
                            <CreditCard className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">Credit:</span>
                          </div>
                          <div className="font-medium">${user.availableCredit} / ${user.creditLimit}</div>
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingUser(user)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        {!user.isActive ? (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleUpdateUser({ isActive: true })}
                              disabled={updateUserMutation.isPending}
                            >
                              <UserCheck className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleUpdateUser({ isActive: false })}
                              disabled={updateUserMutation.isPending}
                            >
                              <UserX className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleUpdateUser({ isActive: false })}
                            disabled={updateUserMutation.isPending}
                          >
                            <UserX className="w-4 h-4 mr-1" />
                            Deactivate
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Edit User Modal */}
        {editingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Edit User</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <Input
                    defaultValue={editingUser.name}
                    onChange={(e) => setEditingUser({...editingUser, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <Input
                    defaultValue={editingUser.email}
                    onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                  />
                </div>
                {editingUser.role === 'customer' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">Credit Limit</label>
                      <Input
                        type="number"
                        defaultValue={editingUser.creditLimit}
                        onChange={(e) => setEditingUser({...editingUser, creditLimit: parseFloat(e.target.value)})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Available Credit</label>
                      <Input
                        type="number"
                        defaultValue={editingUser.availableCredit}
                        onChange={(e) => setEditingUser({...editingUser, availableCredit: parseFloat(e.target.value)})}
                      />
                    </div>
                  </>
                )}
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={() => handleUpdateUser({
                      name: editingUser.name,
                      email: editingUser.email,
                      ...(editingUser.role === 'customer' && {
                        creditLimit: editingUser.creditLimit,
                        availableCredit: editingUser.availableCredit
                      })
                    })}
                    disabled={updateUserMutation.isPending}
                    className="flex-1"
                  >
                    Save Changes
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setEditingUser(null)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}