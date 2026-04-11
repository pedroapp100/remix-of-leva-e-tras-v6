import { PERMISSION_MODULES } from "@/lib/permissions";
import type { Cargo } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Shield, Check, X, Minus } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AccessLevel } from "@/lib/permissions";
import { getModuleAccessLevel } from "@/lib/permissions";

interface PermissionMatrixProps {
  cargos?: Cargo[];
}

function AccessBadge({ level }: { level: AccessLevel }) {
  if (level === "total") {
    return (
      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1 text-xs font-medium">
        <Check className="h-3 w-3" /> Total
      </Badge>
    );
  }
  if (level === "parcial") {
    return (
      <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1 text-xs font-medium">
        <Minus className="h-3 w-3" /> Parcial
      </Badge>
    );
  }
  return (
    <Badge className="bg-destructive/10 text-destructive border-destructive/30 gap-1 text-xs font-medium">
      <X className="h-3 w-3" /> Nenhum
    </Badge>
  );
}

export function PermissionMatrix({ cargos = [] }: PermissionMatrixProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Matriz de Permissões</CardTitle>
        </div>
        <CardDescription>
          Visão geral do que cada cargo pode acessar no sistema.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full">
          <div className="min-w-[600px]">
            {/* Header */}
            <div className="grid gap-2" style={{ gridTemplateColumns: `180px repeat(${cargos.length}, 1fr)` }}>
              <div className="p-2 text-sm font-semibold text-muted-foreground">Módulo</div>
              {cargos.map((cargo) => (
                <div key={cargo.id} className="p-2 text-center">
                  <span className="text-sm font-semibold">{cargo.name}</span>
                </div>
              ))}
            </div>

            {/* Rows */}
            {PERMISSION_MODULES.map((mod) => {
              const modKeys = mod.permissions.map(p => p.key);
              return (
                <div
                  key={mod.module}
                  className="grid gap-2 border-t border-border py-2 hover:bg-muted/30 transition-colors"
                  style={{ gridTemplateColumns: `180px repeat(${cargos.length}, 1fr)` }}
                >
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="p-2 text-sm font-medium flex items-center cursor-default">
                          {mod.module}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        <p className="text-xs font-medium mb-1">Ações disponíveis:</p>
                        <ul className="text-xs space-y-0.5">
                          {mod.permissions.map(p => (
                            <li key={p.key} className="text-muted-foreground">{p.label}</li>
                          ))}
                        </ul>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {cargos.map((cargo) => {
                    const level = getModuleAccessLevel(modKeys, cargo.permissions);
                    const granted = mod.permissions.filter(p => cargo.permissions.includes(p.key));
                    return (
                      <TooltipProvider key={cargo.id}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="p-2 flex items-center justify-center cursor-default">
                              <AccessBadge level={level} />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            {granted.length > 0 ? (
                              <ul className="text-xs space-y-0.5">
                                {mod.permissions.map(p => (
                                  <li key={p.key} className={`flex items-center gap-1 ${cargo.permissions.includes(p.key) ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground line-through"}`}>
                                    {cargo.permissions.includes(p.key) ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                    {p.label}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-xs text-muted-foreground">Sem acesso</p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border">
          <span className="text-xs text-muted-foreground">Legenda:</span>
          <AccessBadge level="total" />
          <AccessBadge level="parcial" />
          <AccessBadge level="nenhum" />
        </div>
      </CardContent>
    </Card>
  );
}
