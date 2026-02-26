"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Plug, Lock, Globe, Zap, Package, FileText, AlertTriangle, FlaskConical } from "lucide-react";
import {
  SiDocker,
  SiGithub,
  SiGitlab,
  SiApple,
  SiGoogleplay,
  SiGooglechrome,
  SiNpm,
  SiPypi,
  SiHomebrew,
  SiWordpress,
  SiApachemaven,
  SiNuget,
  SiPhp,
  SiRust,
  SiRubygems,
  SiGo,
  SiHelm,
  SiSnapcraft,
  SiFlathub,
  SiTerraform,
  SiChocolatey,
  SiOpenverse,
  SiFdroid,
  SiLibrariesdotio,
  SiRedhat,
} from "react-icons/si";
import { FaWindows, FaMicrosoft, FaFirefoxBrowser } from "react-icons/fa";
import {
  SiDart,
  SiElixir,
  SiAnaconda,
  SiCocoapods,
  SiPerl,
  SiJetbrains,
  SiArchlinux,
  SiAnsible,
  SiBitbucket,
} from "react-icons/si";
import { VscCode } from "react-icons/vsc";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { SourceForm } from "@/components/admin/source-form";
import { useTranslation } from "@/i18n/config";
import { useToast } from "@/components/ui/toast";

interface CheckSource {
  id: string;
  name: string;
  type: string;
  config: string;
  isBuiltIn: boolean;
  description: string | null;
  createdAt: string;
  _count: { items: number };
}

const typeIcons: Record<string, React.ReactNode> = {
  dockerhub: <SiDocker className="h-4 w-4" />,
  github: <SiGithub className="h-4 w-4" />,
  gitlab: <SiGitlab className="h-4 w-4" />,
  appstore: <SiApple className="h-4 w-4" />,
  playstore: <SiGoogleplay className="h-4 w-4" />,
  msstore: <FaMicrosoft className="h-4 w-4" />,
  json_api: <Zap className="h-4 w-4" />,
  html: <Globe className="h-4 w-4" />,
  chrome: <SiGooglechrome className="h-4 w-4" />,
  endoflife: <AlertTriangle className="h-4 w-4" />,
  npm: <SiNpm className="h-4 w-4" />,
  pypi: <SiPypi className="h-4 w-4" />,
  repology: <Package className="h-4 w-4" />,
  homebrew: <SiHomebrew className="h-4 w-4" />,
  wordpress: <SiWordpress className="h-4 w-4" />,
  winget: <FaWindows className="h-4 w-4" />,
  csv_data: <FileText className="h-4 w-4" />,
  maven: <SiApachemaven className="h-4 w-4" />,
  nuget: <SiNuget className="h-4 w-4" />,
  packagist: <SiPhp className="h-4 w-4" />,
  crates: <SiRust className="h-4 w-4" />,
  rubygems: <SiRubygems className="h-4 w-4" />,
  goproxy: <SiGo className="h-4 w-4" />,
  helm: <SiHelm className="h-4 w-4" />,
  snap: <SiSnapcraft className="h-4 w-4" />,
  flathub: <SiFlathub className="h-4 w-4" />,
  terraform: <SiTerraform className="h-4 w-4" />,
  chocolatey: <SiChocolatey className="h-4 w-4" />,
  pub: <SiDart className="h-4 w-4" />,
  hex: <SiElixir className="h-4 w-4" />,
  conda: <SiAnaconda className="h-4 w-4" />,
  cocoapods: <SiCocoapods className="h-4 w-4" />,
  cpan: <SiPerl className="h-4 w-4" />,
  fdroid: <SiFdroid className="h-4 w-4" />,
  firefox_addon: <FaFirefoxBrowser className="h-4 w-4" />,
  vscode: <VscCode className="h-4 w-4" />,
  jetbrains: <SiJetbrains className="h-4 w-4" />,
  openvsx: <SiOpenverse className="h-4 w-4" />,
  aur: <SiArchlinux className="h-4 w-4" />,
  ansible: <SiAnsible className="h-4 w-4" />,
  quay: <SiRedhat className="h-4 w-4" />,
  bitbucket: <SiBitbucket className="h-4 w-4" />,
  libraries_io: <SiLibrariesdotio className="h-4 w-4" />,
};

const typeBadgeVariants: Record<string, "default" | "success" | "warning" | "info" | "outline"> = {
  // API officielle/stable (vert)
  github: "success",
  gitlab: "success",
  dockerhub: "success",
  npm: "success",
  pypi: "success",
  nuget: "success",
  maven: "success",
  packagist: "success",
  crates: "success",
  rubygems: "success",
  goproxy: "success",
  homebrew: "success",
  chocolatey: "success",
  winget: "success",
  helm: "success",
  snap: "success",
  flathub: "success",
  terraform: "success",
  // API communautaire/tierce (bleu)
  appstore: "info",
  playstore: "info",
  msstore: "info",
  chrome: "info",
  endoflife: "info",
  repology: "info",
  wordpress: "info",
  // Scraping web / moins fiable (orange)
  html: "warning",
  json_api: "warning",
  // Source manuelle (outline)
  csv_data: "outline",
  pub: "success",
  hex: "success",
  conda: "success",
  cocoapods: "success",
  cpan: "success",
  fdroid: "info",
  firefox_addon: "info",
  vscode: "info",
  jetbrains: "info",
  openvsx: "info",
  aur: "info",
  ansible: "success",
  quay: "success",
  bitbucket: "success",
  libraries_io: "success",
};

const SOURCES_REQUIRING_CREDENTIALS: Record<string, string> = {
  bitbucket: "bitbucket_token",
  libraries_io: "libraries_io_api_key",
};

export default function AdminSourcesPage() {
  const [sources, setSources] = useState<CheckSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editSource, setEditSource] = useState<CheckSource | null>(null);
  const [testSource, setTestSource] = useState<CheckSource | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [configuredKeys, setConfiguredKeys] = useState<Record<string, boolean>>({});
  const t = useTranslation();
  const { toast } = useToast();

  const fetchSources = useCallback(async () => {
    try {
      const res = await fetch("/api/sources");
      if (res.ok) {
        const data = await res.json();
        setSources(data.data);
      }
    } catch {
      toast("Fehler beim Laden", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSources();
    fetch("/api/settings").then((r) => r.ok ? r.json() : null).then((d) => {
      if (d?.hasValues) setConfiguredKeys(d.hasValues);
    }).catch(() => {});
  }, [fetchSources]);

  const isSourceMissingCredentials = (type: string) => {
    const key = SOURCES_REQUIRING_CREDENTIALS[type];
    return key ? !configuredKeys[key] : false;
  };

  const handleSave = async (data: { id?: string; name: string; type: string; config: string; description: string }) => {
    try {
      const isEdit = !!editSource;
      const url = isEdit ? `/api/sources/${editSource!.id}` : "/api/sources";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        toast(isEdit ? "Prüfquelle aktualisiert" : "Prüfquelle erstellt", "success");
        fetchSources();
      } else {
        const err = await res.json();
        toast(err.error || "Error", "error");
      }
    } catch {
      toast("Netzwerkfehler", "error");
    }
    setEditSource(null);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/sources/${deleteId}`, { method: "DELETE" });
      if (res.ok) {
        toast("Check source deleted", "success");
        fetchSources();
      } else {
        const err = await res.json();
        toast(err.error || "Error", "error");
      }
    } catch {
      toast("Netzwerkfehler", "error");
    }
    setDeleteId(null);
  };

  const openEdit = (source: CheckSource) => {
    setEditSource(source);
    setFormOpen(true);
  };

  const openCreate = () => {
    setEditSource(null);
    setFormOpen(true);
  };

  const openTest = (source: CheckSource) => {
    setTestSource(source);
  };

  const deleteSource = sources.find((s) => s.id === deleteId);

  return (
    <>
      <Header
        title={t.sources.title}
        actions={
          <Button onClick={openCreate} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            {t.sources.addSource}
          </Button>
        }
      />

      <div className="flex-1 p-4 lg:p-8">
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : sources.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Plug className="h-12 w-12 mb-3 opacity-50" />
                <p>{t.common.noData}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left text-sm text-muted-foreground">
                      <th className="px-4 py-1.5 font-medium">{t.sources.name}</th>
                      <th className="px-4 py-1.5 font-medium">{t.sources.type}</th>
                      <th className="px-4 py-1.5 font-medium hidden md:table-cell">{t.sources.description}</th>
                      <th className="px-4 py-1.5 font-medium hidden sm:table-cell">{t.sources.linkedItems}</th>
                      <th className="px-4 py-1.5 font-medium text-right">{t.common.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sources.map((source) => (
                      <tr key={source.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-1.5">
                          <div className="flex items-center gap-2">
                            <span className={isSourceMissingCredentials(source.type) ? "text-muted-foreground/40" : "text-muted-foreground"}>
                              {typeIcons[source.type] || <Plug className="h-4 w-4" />}
                            </span>
                            <span className={`font-medium ${isSourceMissingCredentials(source.type) ? "text-muted-foreground" : ""}`}>{source.name}</span>
                            {source.isBuiltIn && (
                              <Badge variant="outline" className="text-xs gap-1">
                                <Lock className="h-3 w-3" />
                                {t.sources.builtIn}
                              </Badge>
                            )}
                            {isSourceMissingCredentials(source.type) && (
                              <Badge variant="warning" className="text-xs gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                {t.sources.credentialsRequired}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-1.5">
                          <Badge variant={typeBadgeVariants[source.type] || "outline"}>
                            {t.sources.types[source.type as keyof typeof t.sources.types] || source.type}
                          </Badge>
                        </td>
                        <td className="px-4 py-1.5 hidden md:table-cell text-sm text-muted-foreground max-w-xs truncate">
                          {source.description || "—"}
                        </td>
                        <td className="px-4 py-1.5 hidden sm:table-cell">
                          <Badge variant="outline">{source._count.items}</Badge>
                        </td>
                        <td className="px-4 py-1.5">
                          <div className="flex justify-end gap-1">
                            {source.isBuiltIn ? (
                              <Button variant="ghost" size="icon" onClick={() => openTest(source)} title={t.sources.testSource}>
                                <FlaskConical className="h-4 w-4" />
                              </Button>
                            ) : (
                              <>
                                <Button variant="ghost" size="icon" onClick={() => openEdit(source)} title={t.common.edit}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => setDeleteId(source.id)} title={t.common.delete}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="border-t px-4 py-3 text-xs text-muted-foreground">
                  <span className="font-medium mr-2">{t.sources.legend.title}</span>
                  <span className="inline-flex flex-wrap items-center gap-2">
                    <Badge variant="success" className="text-[10px]">{t.sources.legend.officialStable}</Badge>
                    <Badge variant="info" className="text-[10px]">{t.sources.legend.communityThirdParty}</Badge>
                    <Badge variant="warning" className="text-[10px]">{t.sources.legend.scrapingVariableReliability}</Badge>
                    <Badge variant="outline" className="text-[10px]">{t.sources.legend.manualSource}</Badge>
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <SourceForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditSource(null);
        }}
        onSave={handleSave}
        source={
          editSource
            ? {
                id: editSource.id,
                name: editSource.name,
                type: editSource.type,
                config: editSource.config,
                description: editSource.description || "",
                isBuiltIn: editSource.isBuiltIn,
              }
            : null
        }
      />

      <SourceForm
        open={!!testSource}
        onClose={() => setTestSource(null)}
        onSave={async () => {}}
        testOnly
        source={
          testSource
            ? {
                id: testSource.id,
                name: testSource.name,
                type: testSource.type,
                config: testSource.config,
                description: testSource.description || "",
                isBuiltIn: testSource.isBuiltIn,
              }
            : null
        }
      />

      <Dialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title={t.sources.deleteSource}
      >
        <p className="text-sm text-muted-foreground mb-2">
          {t.sources.deleteConfirm}
        </p>
        {deleteSource && deleteSource._count.items > 0 && (
          <p className="text-sm text-warning mb-4">
            ⚠ {deleteSource._count.items} {t.sources.linkedItems}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteId(null)}>
            {t.common.cancel}
          </Button>
          <Button variant="outline" className="text-destructive border-destructive/40 hover:bg-destructive/10" onClick={handleDelete}>
            {t.common.delete}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
