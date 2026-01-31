"use client";

import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import {
  User,
  Save,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  X,
  Upload,
  UserPlus,
  Users,
  Edit,
  Power,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(session?.user?.name || "");
  const [isUploading, setIsUploading] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Add user modal state
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<"ADMIN" | "USER">("USER");
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);

  // Users list modal state
  const [isUsersListModalOpen, setIsUsersListModalOpen] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Edit user modal state
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editUserName, setEditUserName] = useState("");
  const [editUserEmail, setEditUserEmail] = useState("");
  const [editUserPassword, setEditUserPassword] = useState("");
  const [editUserRole, setEditUserRole] = useState<"ADMIN" | "USER">("USER");
  const [showEditUserPassword, setShowEditUserPassword] = useState(false);

  // Update name when session loads
  useState(() => {
    if (session?.user?.name) {
      setName(session.user.name);
    }
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { name?: string; image?: string | null }) => {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Profil güncellenemedi");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description:
          "Profil bilgileri güncellendi. Değişikliklerin görünmesi için sayfayı yenileyin.",
      });
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Profil güncellenirken hata oluştu",
        variant: "destructive",
      });
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: {
      currentPassword: string;
      newPassword: string;
    }) => {
      const res = await fetch("/api/user/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Şifre değiştirilemedi");
      }
      return res.json();
    },
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({
        title: "Başarılı",
        description: "Şifre başarıyla değiştirildi",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      email: string;
      password: string;
      role: "ADMIN" | "USER";
    }) => {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Kullanıcı oluşturulamadı");
      }
      return res.json();
    },
    onSuccess: () => {
      // Form'u temizle
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserRole("USER");
      setIsAddUserModalOpen(false);

      toast({
        title: "Başarılı",
        description: "Yeni kullanıcı başarıyla oluşturuldu",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Hata",
        description: "Resim boyutu 5MB'dan küçük olmalıdır",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      updateProfileMutation.mutate({ image: base64 });
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    if (confirm("Profil resmini kaldırmak istediğinize emin misiniz?")) {
      updateProfileMutation.mutate({ image: null });
    }
  };

  const handleSaveProfile = () => {
    updateProfileMutation.mutate({ name });
  };

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Hata",
        description: "Tüm alanları doldurun",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Hata",
        description: "Yeni şifreler eşleşmiyor",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Hata",
        description: "Şifre en az 6 karakter olmalıdır",
        variant: "destructive",
      });
      return;
    }

    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  const handleCreateUser = () => {
    // Validation
    if (!newUserName || !newUserEmail || !newUserPassword) {
      toast({
        title: "Hata",
        description: "Tüm alanları doldurun",
        variant: "destructive",
      });
      return;
    }

    if (newUserName.length < 2) {
      toast({
        title: "Hata",
        description: "Ad Soyad en az 2 karakter olmalıdır",
        variant: "destructive",
      });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUserEmail)) {
      toast({
        title: "Hata",
        description: "Geçerli bir e-posta adresi giriniz",
        variant: "destructive",
      });
      return;
    }

    if (newUserPassword.length < 6) {
      toast({
        title: "Hata",
        description: "Şifre en az 6 karakter olmalıdır",
        variant: "destructive",
      });
      return;
    }

    createUserMutation.mutate({
      name: newUserName,
      email: newUserEmail,
      password: newUserPassword,
      role: newUserRole,
    });
  };

  // Fetch users
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Kullanıcılar yüklenemedi");
      const data = await res.json();
      setUsers(data.users || []);
    } catch (error) {
      toast({
        title: "Hata",
        description: "Kullanıcılar yüklenirken hata oluştu",
        variant: "destructive",
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  // Open users list modal
  const handleOpenUsersList = () => {
    setIsUsersListModalOpen(true);
    fetchUsers();
  };

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (data: {
      id: string;
      name?: string;
      email?: string;
      password?: string;
      role?: "ADMIN" | "USER";
      active?: boolean;
    }) => {
      const { id, ...updateData } = data;
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Kullanıcı güncellenemedi");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Kullanıcı başarıyla güncellendi",
      });
      fetchUsers(); // Listeyi yenile
      setIsEditUserModalOpen(false);
      setEditingUser(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Open edit user modal
  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setEditUserName(user.name);
    setEditUserEmail(user.email);
    setEditUserPassword("");
    setEditUserRole(user.role);
    setIsEditUserModalOpen(true);
  };

  // Save edited user
  const handleSaveEditedUser = () => {
    if (!editingUser) return;

    // Validation
    if (!editUserName || !editUserEmail) {
      toast({
        title: "Hata",
        description: "Ad Soyad ve E-posta zorunludur",
        variant: "destructive",
      });
      return;
    }

    if (editUserName.length < 2) {
      toast({
        title: "Hata",
        description: "Ad Soyad en az 2 karakter olmalıdır",
        variant: "destructive",
      });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editUserEmail)) {
      toast({
        title: "Hata",
        description: "Geçerli bir e-posta adresi giriniz",
        variant: "destructive",
      });
      return;
    }

    if (editUserPassword && editUserPassword.length < 6) {
      toast({
        title: "Hata",
        description: "Şifre en az 6 karakter olmalıdır",
        variant: "destructive",
      });
      return;
    }

    const updateData: any = {
      id: editingUser.id,
      name: editUserName,
      email: editUserEmail,
      role: editUserRole,
    };

    if (editUserPassword) {
      updateData.password = editUserPassword;
    }

    updateUserMutation.mutate(updateData);
  };

  // Toggle user active status
  const handleToggleUserActive = (user: any) => {
    const action = user.active ? "pasif" : "aktif";
    if (
      confirm(
        `${user.name} kullanıcısını ${action} yapmak istediğinize emin misiniz?`,
      )
    ) {
      updateUserMutation.mutate({
        id: user.id,
        active: !user.active,
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Oturum bilgisi bulunamadı</p>
        <p className="text-sm text-muted-foreground mt-2">
          Lütfen tekrar giriş yapın
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn max-w-4xl">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <User className="w-6 h-6 text-primary" />
            Kullanıcı Profili
          </h1>
          <p className="text-muted-foreground">
            Profil bilgilerinizi ve şifrenizi yönetin
          </p>
        </div>

        {/* Add User Button - Sadece ADMIN için */}
        {session.user.role === "ADMIN" && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleOpenUsersList}
              className="gap-2"
            >
              <Users className="w-4 h-4" />
              Kullanıcılar
            </Button>
            <Button
              onClick={() => setIsAddUserModalOpen(true)}
              className="gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Yeni Kullanıcı Ekle
            </Button>
          </div>
        )}
      </div>

      {/* Profile Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Profil Bilgileri
          </CardTitle>
          <CardDescription>Adınız ve profil resminiz</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center gap-6">
            <div className="relative group">
              <Avatar className="w-24 h-24">
                <AvatarImage
                  src={session.user.image || undefined}
                  alt={session.user.name || "User"}
                />
                <AvatarFallback className="text-2xl bg-gradient-to-br from-teal-400 to-teal-600 text-white">
                  {getInitials(session.user.name || "U")}
                </AvatarFallback>
              </Avatar>

              {/* Upload/Remove Buttons */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                {isUploading ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
                      title="Resim Yükle"
                    >
                      <Upload className="w-4 h-4 text-gray-700" />
                    </button>
                    {session.user.image && (
                      <button
                        onClick={handleRemoveImage}
                        className="p-2 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
                        title="Resmi Kaldır"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            <div className="flex-1">
              <h3 className="text-lg font-semibold">{session.user.name}</h3>
              <p className="text-sm text-muted-foreground">
                {session.user.email}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary" className="text-xs">
                  {session.user.role === "ADMIN" ? "Yönetici" : "Kullanıcı"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Ad Soyad</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ad Soyad"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-posta</Label>
              <Input
                id="email"
                value={session.user.email || ""}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                E-posta adresi değiştirilemez
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSaveProfile}
              disabled={updateProfileMutation.isPending}
            >
              {updateProfileMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Kaydet
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Change Password Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            Şifre Değiştir
          </CardTitle>
          <CardDescription>
            Hesap güvenliğiniz için güçlü bir şifre kullanın
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Mevcut Şifre</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Mevcut şifreniz"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showCurrentPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">Yeni Şifre</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Yeni şifreniz (en az 6 karakter)"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNewPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Yeni Şifre (Tekrar)</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Yeni şifrenizi tekrar girin"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleChangePassword}
              disabled={changePasswordMutation.isPending}
              variant="outline"
            >
              {changePasswordMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Lock className="w-4 h-4 mr-2" />
              )}
              Şifreyi Değiştir
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Add User Modal */}
      <Dialog open={isAddUserModalOpen} onOpenChange={setIsAddUserModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Yeni Kullanıcı Ekle
            </DialogTitle>
            <DialogDescription>
              Sisteme yeni bir kullanıcı ekleyin. Tüm alanlar zorunludur.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Ad Soyad */}
            <div className="space-y-2">
              <Label htmlFor="newUserName">
                Ad Soyad <span className="text-red-500">*</span>
              </Label>
              <Input
                id="newUserName"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="Örn: Ahmet Yılmaz"
                disabled={createUserMutation.isPending}
              />
            </div>

            {/* E-posta */}
            <div className="space-y-2">
              <Label htmlFor="newUserEmail">
                E-posta <span className="text-red-500">*</span>
              </Label>
              <Input
                id="newUserEmail"
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="ornek@email.com"
                disabled={createUserMutation.isPending}
              />
            </div>

            {/* Şifre */}
            <div className="space-y-2">
              <Label htmlFor="newUserPassword">
                Şifre <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="newUserPassword"
                  type={showNewUserPassword ? "text" : "password"}
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="En az 6 karakter"
                  disabled={createUserMutation.isPending}
                />
                <button
                  type="button"
                  onClick={() => setShowNewUserPassword(!showNewUserPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  disabled={createUserMutation.isPending}
                >
                  {showNewUserPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Rol */}
            <div className="space-y-2">
              <Label htmlFor="newUserRole">
                Rol <span className="text-red-500">*</span>
              </Label>
              <Select
                value={newUserRole}
                onValueChange={(value: "ADMIN" | "USER") =>
                  setNewUserRole(value)
                }
                disabled={createUserMutation.isPending}
              >
                <SelectTrigger id="newUserRole">
                  <SelectValue placeholder="Rol seçiniz" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">Kullanıcı</SelectItem>
                  <SelectItem value="ADMIN">Yönetici</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Yönetici tüm yetkilere sahiptir
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddUserModalOpen(false);
                // Form'u temizle
                setNewUserName("");
                setNewUserEmail("");
                setNewUserPassword("");
                setNewUserRole("USER");
              }}
              disabled={createUserMutation.isPending}
            >
              İptal
            </Button>
            <Button
              onClick={handleCreateUser}
              disabled={createUserMutation.isPending}
            >
              {createUserMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Oluşturuluyor...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Kullanıcı Oluştur
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Users List Modal */}
      <Dialog
        open={isUsersListModalOpen}
        onOpenChange={setIsUsersListModalOpen}
      >
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Kullanıcılar
            </DialogTitle>
            <DialogDescription>
              Sistemdeki tüm kullanıcıları görüntüleyin
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {loadingUsers ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Henüz kullanıcı bulunmuyor
              </div>
            ) : (
              <div className="space-y-3">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="w-12 h-12">
                      <AvatarImage
                        src={user.image || undefined}
                        alt={user.name}
                      />
                      <AvatarFallback className="bg-gradient-to-br from-teal-400 to-teal-600 text-white">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold truncate">{user.name}</h4>
                        <Badge
                          variant={
                            user.role === "ADMIN" ? "default" : "secondary"
                          }
                          className="text-xs"
                        >
                          {user.role === "ADMIN" ? "Yönetici" : "Kullanıcı"}
                        </Badge>
                        {!user.active && (
                          <Badge variant="destructive" className="text-xs">
                            Pasif
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {user.email}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Kayıt:{" "}
                        {new Date(user.createdAt).toLocaleDateString("tr-TR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {user.id === session.user.id ? (
                        <Badge variant="outline" className="text-xs">
                          Siz
                        </Badge>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditUser(user)}
                            disabled={updateUserMutation.isPending}
                            title="Düzenle"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant={user.active ? "destructive" : "default"}
                            onClick={() => handleToggleUserActive(user)}
                            disabled={updateUserMutation.isPending}
                            title={user.active ? "Pasif Yap" : "Aktif Yap"}
                          >
                            <Power className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsUsersListModalOpen(false)}
            >
              Kapat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={isEditUserModalOpen} onOpenChange={setIsEditUserModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-primary" />
              Kullanıcı Düzenle
            </DialogTitle>
            <DialogDescription>
              Kullanıcı bilgilerini güncelleyin
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Ad Soyad */}
            <div className="space-y-2">
              <Label htmlFor="editUserName">
                Ad Soyad <span className="text-red-500">*</span>
              </Label>
              <Input
                id="editUserName"
                value={editUserName}
                onChange={(e) => setEditUserName(e.target.value)}
                placeholder="Örn: Ahmet Yılmaz"
                disabled={updateUserMutation.isPending}
              />
            </div>

            {/* E-posta */}
            <div className="space-y-2">
              <Label htmlFor="editUserEmail">
                E-posta <span className="text-red-500">*</span>
              </Label>
              <Input
                id="editUserEmail"
                type="email"
                value={editUserEmail}
                onChange={(e) => setEditUserEmail(e.target.value)}
                placeholder="ornek@email.com"
                disabled={updateUserMutation.isPending}
              />
            </div>

            {/* Şifre (Opsiyonel) */}
            <div className="space-y-2">
              <Label htmlFor="editUserPassword">Yeni Şifre (Opsiyonel)</Label>
              <div className="relative">
                <Input
                  id="editUserPassword"
                  type={showEditUserPassword ? "text" : "password"}
                  value={editUserPassword}
                  onChange={(e) => setEditUserPassword(e.target.value)}
                  placeholder="Değiştirmek için yeni şifre girin"
                  disabled={updateUserMutation.isPending}
                />
                <button
                  type="button"
                  onClick={() => setShowEditUserPassword(!showEditUserPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  disabled={updateUserMutation.isPending}
                >
                  {showEditUserPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Boş bırakırsanız şifre değişmez
              </p>
            </div>

            {/* Rol */}
            <div className="space-y-2">
              <Label htmlFor="editUserRole">
                Rol <span className="text-red-500">*</span>
              </Label>
              <Select
                value={editUserRole}
                onValueChange={(value: "ADMIN" | "USER") =>
                  setEditUserRole(value)
                }
                disabled={updateUserMutation.isPending}
              >
                <SelectTrigger id="editUserRole">
                  <SelectValue placeholder="Rol seçiniz" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">Kullanıcı</SelectItem>
                  <SelectItem value="ADMIN">Yönetici</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditUserModalOpen(false);
                setEditingUser(null);
              }}
              disabled={updateUserMutation.isPending}
            >
              İptal
            </Button>
            <Button
              onClick={handleSaveEditedUser}
              disabled={updateUserMutation.isPending}
            >
              {updateUserMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Kaydet
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
