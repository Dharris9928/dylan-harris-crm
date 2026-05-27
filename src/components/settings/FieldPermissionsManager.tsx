import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Shield, Plus, Pencil, Trash2, Lock } from 'lucide-react';
import { toast } from 'sonner';

interface FieldPermission {
  id: string;
  table_name: string;
  field_name: string;
  min_role_required: string;
  is_pii: boolean;
  masking_pattern: string | null;
}

export function FieldPermissionsManager() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingPermission, setEditingPermission] = useState<FieldPermission | null>(null);
  const [formData, setFormData] = useState({
    table_name: '',
    field_name: '',
    min_role_required: 'sales_rep',
    is_pii: false,
    masking_pattern: ''
  });

  const queryClient = useQueryClient();

  const { data: permissions, isLoading } = useQuery({
    queryKey: ['field-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('field_permissions')
        .select('*')
        .order('table_name', { ascending: true })
        .order('field_name', { ascending: true });

      if (error) throw error;
      return data as FieldPermission[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('field_permissions')
        .insert({
          table_name: data.table_name,
          field_name: data.field_name,
          min_role_required: data.min_role_required,
          is_pii: data.is_pii,
          masking_pattern: data.masking_pattern || null
        });

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['field-permissions'] });
      setIsAddDialogOpen(false);
      resetForm();
      toast.success('Field permission created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create permission', {
        description: error.message
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from('field_permissions')
        .update({
          min_role_required: data.min_role_required,
          is_pii: data.is_pii,
          masking_pattern: data.masking_pattern || null
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['field-permissions'] });
      setEditingPermission(null);
      toast.success('Field permission updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update permission', {
        description: error.message
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('field_permissions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['field-permissions'] });
      toast.success('Field permission deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete permission', {
        description: error.message
      });
    },
  });

  const resetForm = () => {
    setFormData({
      table_name: '',
      field_name: '',
      min_role_required: 'sales_rep',
      is_pii: false,
      masking_pattern: ''
    });
  };

  const handleEdit = (permission: FieldPermission) => {
    setEditingPermission(permission);
    setFormData({
      table_name: permission.table_name,
      field_name: permission.field_name,
      min_role_required: permission.min_role_required,
      is_pii: permission.is_pii,
      masking_pattern: permission.masking_pattern || ''
    });
  };

  const handleSubmit = () => {
    if (editingPermission) {
      updateMutation.mutate({ id: editingPermission.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-500/10 text-red-500',
      sales_manager: 'bg-orange-500/10 text-orange-500',
      sales_rep: 'bg-blue-500/10 text-blue-500',
      read_only: 'bg-gray-500/10 text-gray-500'
    };
    return colors[role] || 'bg-gray-500/10 text-gray-500';
  };

  if (isLoading) {
    return <div>Loading field permissions...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Field-Level Permissions
            </CardTitle>
            <CardDescription>
              Control access to sensitive fields based on user roles
            </CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Permission
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Field Permission</DialogTitle>
                <DialogDescription>
                  Define access rules for a specific field
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Table Name</Label>
                  <Input
                    value={formData.table_name}
                    onChange={(e) => setFormData({ ...formData, table_name: e.target.value })}
                    placeholder="e.g., companies, contacts"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Field Name</Label>
                  <Input
                    value={formData.field_name}
                    onChange={(e) => setFormData({ ...formData, field_name: e.target.value })}
                    placeholder="e.g., email, phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Minimum Role Required</Label>
                  <Select
                    value={formData.min_role_required}
                    onValueChange={(value) => setFormData({ ...formData, min_role_required: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="read_only">Read Only</SelectItem>
                      <SelectItem value="sales_rep">Sales Rep</SelectItem>
                      <SelectItem value="sales_manager">Sales Manager</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <Label>Contains PII</Label>
                  <Switch
                    checked={formData.is_pii}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_pii: checked })}
                  />
                </div>
                {formData.is_pii && (
                  <div className="space-y-2">
                    <Label>Masking Pattern</Label>
                    <Input
                      value={formData.masking_pattern}
                      onChange={(e) => setFormData({ ...formData, masking_pattern: e.target.value })}
                      placeholder="e.g., ***@***.com, (***) ***-****"
                    />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                  Create Permission
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Table</TableHead>
              <TableHead>Field</TableHead>
              <TableHead>Min Role</TableHead>
              <TableHead>PII</TableHead>
              <TableHead>Masking</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {permissions?.map((permission) => (
              <TableRow key={permission.id}>
                <TableCell className="font-medium">{permission.table_name}</TableCell>
                <TableCell>{permission.field_name}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-md text-xs font-medium ${getRoleBadgeColor(permission.min_role_required)}`}>
                    {permission.min_role_required}
                  </span>
                </TableCell>
                <TableCell>
                  {permission.is_pii && <Lock className="h-4 w-4 text-muted-foreground" />}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {permission.masking_pattern || '-'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Dialog open={editingPermission?.id === permission.id} onOpenChange={(open) => !open && setEditingPermission(null)}>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(permission)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Field Permission</DialogTitle>
                          <DialogDescription>
                            Update access rules for {permission.table_name}.{permission.field_name}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Minimum Role Required</Label>
                            <Select
                              value={formData.min_role_required}
                              onValueChange={(value) => setFormData({ ...formData, min_role_required: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="read_only">Read Only</SelectItem>
                                <SelectItem value="sales_rep">Sales Rep</SelectItem>
                                <SelectItem value="sales_manager">Sales Manager</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center justify-between">
                            <Label>Contains PII</Label>
                            <Switch
                              checked={formData.is_pii}
                              onCheckedChange={(checked) => setFormData({ ...formData, is_pii: checked })}
                            />
                          </div>
                          {formData.is_pii && (
                            <div className="space-y-2">
                              <Label>Masking Pattern</Label>
                              <Input
                                value={formData.masking_pattern}
                                onChange={(e) => setFormData({ ...formData, masking_pattern: e.target.value })}
                                placeholder="e.g., ***@***.com, (***) ***-****"
                              />
                            </div>
                          )}
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setEditingPermission(null)}>
                            Cancel
                          </Button>
                          <Button onClick={handleSubmit} disabled={updateMutation.isPending}>
                            Update Permission
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this field permission?')) {
                          deleteMutation.mutate(permission.id);
                        }
                      }}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
