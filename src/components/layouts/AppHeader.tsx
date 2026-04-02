import { Bell, LogOut, Sun, Moon, Monitor, Calendar, Menu, CheckCheck, AlertTriangle, AlertCircle, Info, CheckCircle2, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import logoLevaTraz from "@/assets/logo-leva-e-traz.png";
import { useTheme } from "@/contexts/ThemeProvider";
import { useNotifications, type Notification } from "@/contexts/NotificationContext";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { OnboardingHelpButton } from "@/onboarding/OnboardingHelpButton";
import { Button } from "@/components/ui/button";
import { MOCK_CARGOS } from "@/data/mockSettings";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSidebar } from "@/components/ui/sidebar";

export function AppHeader() {
  const { user, logout, changeCargo } = useAuth();
  const { theme, setTheme } = useTheme();
  const { totalUnread, notifications, markAsRead, markAllAsRead, unreadCount } = useNotifications();
  const navigate = useNavigate();
  const { isMobile, toggleSidebar } = useSidebar();

  const initials = user?.nome
    ? user.nome
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "??";

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const themeIcon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  const ThemeIcon = themeIcon;

  const today = new Date().toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <header className="h-14 md:h-16 flex items-center justify-between border-b border-sidebar-border bg-sidebar px-3 md:px-4 shrink-0 sticky top-0 z-50 w-full">
      <div className="flex items-center gap-2 md:gap-3">
        {/* Mobile menu trigger */}
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-lg md:hidden"
            onClick={toggleSidebar}
            aria-label="Abrir menu de navegação"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <img src={logoLevaTraz} alt="Leva e Traz" className="h-10 md:h-12 w-auto shrink-0 object-contain" />
        <span className="text-sm font-semibold tracking-tight hidden sm:inline">Leva e Traz</span>
      </div>

      <div className="flex items-center gap-1.5 md:gap-3">
        {/* Date */}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span>{today}</span>
        </div>
        {/* Onboarding help */}
        <OnboardingHelpButton />
        {/* Theme toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 md:h-9 md:w-9 rounded-lg hover:bg-muted/60 hover:text-foreground transition-all duration-200"
              aria-label="Alterar tema"
            >
              <ThemeIcon className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl">
            <DropdownMenuItem onClick={() => setTheme("light")} className="rounded-lg cursor-pointer">
              <Sun className="mr-2 h-4 w-4" /> Claro
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")} className="rounded-lg cursor-pointer">
              <Moon className="mr-2 h-4 w-4" /> Escuro
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")} className="rounded-lg cursor-pointer">
              <Monitor className="mr-2 h-4 w-4" /> Sistema
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 md:h-9 md:w-9 relative rounded-lg hover:bg-muted/60 hover:text-foreground transition-all duration-200"
              aria-label={`Notificações${totalUnread > 0 ? `, ${totalUnread} não lidas` : ""}`}
            >
              <Bell className="h-4 w-4" />
              {totalUnread > 0 && (
                <span className="absolute -top-1 -right-1 h-[18px] min-w-[18px] px-1 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center ring-2 ring-background">
                  {totalUnread > 9 ? "9+" : totalUnread}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Notificações</p>
                <p className="text-xs text-muted-foreground">{unreadCount} não lidas</p>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Marcar todas
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length > 0 ? notifications.map((notif) => {
                const IconComponent = notif.type === "warning" ? AlertTriangle
                  : notif.type === "error" ? AlertCircle
                  : notif.type === "success" ? CheckCircle2
                  : Info;
                const colorClass = notif.type === "warning" ? "text-status-pending bg-status-pending/10"
                  : notif.type === "error" ? "text-destructive bg-destructive/10"
                  : notif.type === "success" ? "text-emerald-600 bg-emerald-500/10"
                  : "text-primary bg-primary/10";
                const [iconColor, bgColor] = colorClass.split(" ");

                return (
                  <button
                    key={notif.id}
                    className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left ${!notif.read ? "bg-muted/30" : ""}`}
                    onClick={() => {
                      markAsRead(notif.id);
                      if (notif.link) navigate(notif.link);
                    }}
                  >
                    <div className={`mt-0.5 h-8 w-8 rounded-lg ${bgColor} flex items-center justify-center shrink-0`}>
                      <IconComponent className={`h-4 w-4 ${iconColor}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm ${!notif.read ? "font-semibold" : "font-medium text-muted-foreground"}`}>{notif.title}</p>
                        {!notif.read && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{notif.message}</p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1">
                        {formatDistanceToNow(notif.createdAt, { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                  </button>
                );
              }) : (
                <div className="px-4 py-6 text-center">
                  <p className="text-sm text-muted-foreground">Nenhuma notificação</p>
                </div>
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="h-8 md:h-9 gap-1.5 md:gap-2 px-1.5 md:px-2 rounded-lg hover:bg-muted/60 hover:text-foreground transition-all duration-200"
            >
              <Avatar className="h-6 w-6 md:h-7 md:w-7">
                <AvatarFallback className="text-[10px] md:text-xs bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium hidden sm:inline-block max-w-[120px] truncate">
                {user?.nome}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl">
            <DropdownMenuLabel className="font-normal px-3 py-2">
              <p className="text-sm font-medium">{user?.nome}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {user?.role === "admin" && (
              <>
                <DropdownMenuLabel className="px-3 py-1.5 text-xs text-muted-foreground font-normal flex items-center gap-1.5">
                  <Shield className="h-3 w-3" />
                  Cargo ativo
                </DropdownMenuLabel>
                {MOCK_CARGOS.map((cargo) => (
                  <DropdownMenuItem
                    key={cargo.id}
                    onClick={() => changeCargo(cargo.id)}
                    className={`rounded-lg cursor-pointer mx-1 ${user.cargo_id === cargo.id ? "bg-primary/10 text-primary font-medium" : ""}`}
                  >
                    <Shield className={`mr-2 h-3.5 w-3.5 ${user.cargo_id === cargo.id ? "text-primary" : "text-muted-foreground"}`} />
                    {cargo.name}
                    {user.cargo_id === cargo.id && (
                      <span className="ml-auto text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">Ativo</span>
                    )}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={handleLogout} className="rounded-lg cursor-pointer mx-1">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
