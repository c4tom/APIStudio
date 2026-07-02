import React, { useState } from "react";
import {
  Search,
  Sparkles,
  Plus,
  Database,
  Shield,
  Lock,
  Globe,
  Activity,
  Key,
  MapPin,
  Eye,
  Check,
  FileCode,
  Info,
  Layers,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { MockTemplate, mockTemplates } from "../utils/mockTemplates";

interface MockLibraryProps {
  onInstantiate: (template: MockTemplate) => void;
  onClose?: () => void;
}

export const MockLibrary: React.FC<MockLibraryProps> = ({
  onInstantiate,
  onClose
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [expandedPreviewRouteId, setExpandedPreviewRouteId] = useState<string | null>(null);

  // Derive all unique categories
  const categories = ["All", ...Array.from(new Set(mockTemplates.map((t) => t.category)))];

  // Helper to render correct icon
  const getTemplateIcon = (iconName: string) => {
    switch (iconName) {
      case "Database":
        return <Database className="w-5 h-5" />;
      case "Shield":
        return <Shield className="w-5 h-5" />;
      case "Lock":
        return <Lock className="w-5 h-5" />;
      case "Globe":
        return <Globe className="w-5 h-5" />;
      case "Activity":
        return <Activity className="w-5 h-5" />;
      case "Key":
        return <Key className="w-5 h-5" />;
      case "MapPin":
        return <MapPin className="w-5 h-5" />;
      default:
        return <Layers className="w-5 h-5" />;
    }
  };

  // Filter templates based on search and category
  const filteredTemplates = mockTemplates.filter((tmpl) => {
    const matchesSearch =
      tmpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tmpl.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tmpl.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tmpl.routes.some((r) => r.path.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === "All" || tmpl.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div id="mock-library-panel" className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#1E1E1F] text-[#CCCCCC]">
      {/* Visual Header with DevSecOps Architecture Banner */}
      <div className="bg-gradient-to-r from-blue-950/40 via-[#252526] to-purple-950/20 border border-[#333] rounded-xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Sparkles className="w-32 h-32 text-blue-400" />
        </div>
        <div className="max-w-3xl relative z-10 space-y-2">
          <div className="inline-flex items-center space-x-2 bg-blue-900/40 border border-blue-800/80 px-2.5 py-1 rounded-full text-xs font-mono text-blue-400">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>Sandbox Virtualization Engine Active</span>
          </div>
          <h2 className="text-xl font-extrabold text-white font-display tracking-tight">
            Biblioteca de Mocks e Sandboxes
          </h2>
          <p className="text-sm text-gray-400 leading-relaxed">
            Instancie servidores virtuais offline e simuladores de APIs conhecidas com um único clique. Ideal para testar integrações sem consumir créditos, sem requerer credenciais reais e mantendo a segurança DevSecOps total.
          </p>
        </div>

        {/* Helpful Metrics Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-5 mt-5 border-t border-[#333]/60 z-10 relative">
          <div className="flex items-center space-x-3 bg-[#1E1E1F]/60 p-2.5 rounded-lg border border-[#2D2D2D]">
            <Server className="w-4 h-4 text-emerald-400" />
            <div>
              <span className="text-[10px] text-gray-500 block uppercase font-bold">Rotas Portadas</span>
              <span className="text-xs font-bold text-white">Prontos para porta :3000</span>
            </div>
          </div>
          <div className="flex items-center space-x-3 bg-[#1E1E1F]/60 p-2.5 rounded-lg border border-[#2D2D2D]">
            <Shield className="w-4 h-4 text-purple-400" />
            <div>
              <span className="text-[10px] text-gray-500 block uppercase font-bold">Privacidade Total</span>
              <span className="text-xs font-bold text-white">Isolado Local-First</span>
            </div>
          </div>
          <div className="flex items-center space-x-3 bg-[#1E1E1F]/60 p-2.5 rounded-lg border border-[#2D2D2D]">
            <Globe className="w-4 h-4 text-blue-400" />
            <div>
              <span className="text-[10px] text-gray-500 block uppercase font-bold">Base URL Dinâmica</span>
              <span className="text-xs font-bold text-white">/mock/:id/ endpoints</span>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar: Search & Category Filter */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between border-b border-[#2D2D2D] pb-5 shrink-0">
        {/* Search Field */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Pesquisar templates por nome, rota ou descrição..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#252526] border border-[#333] rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Categories Chips */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-thin">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all shrink-0 cursor-pointer ${
                selectedCategory === cat
                  ? "bg-blue-600 border-blue-500 text-white font-semibold"
                  : "bg-[#252526] border-[#333] text-gray-400 hover:text-white hover:bg-[#2D2D2D]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Templates cards */}
      {filteredTemplates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3 bg-[#252526] border border-dashed border-[#333] rounded-xl">
          <Info className="w-8 h-8 text-gray-600" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white">Nenhum template encontrado</h4>
            <p className="text-xs text-gray-400 max-w-sm leading-relaxed">
              Tente reajustar seus termos de busca ou selecione outra categoria acima.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {filteredTemplates.map((tmpl) => (
            <div
              key={tmpl.id}
              className="bg-[#252526] border border-[#333] hover:border-blue-500/50 rounded-xl p-5 transition-all flex flex-col justify-between space-y-4 shadow-md group relative hover:shadow-blue-500/5"
            >
              {/* Highlight badge for specific templates requested (Payment, OAuth, Geo) */}
              {(tmpl.id.includes("stripe") || tmpl.id.includes("oauth2") || tmpl.id.includes("geo-service")) && (
                <div className="absolute top-3 right-3 bg-blue-900/30 border border-blue-800 text-blue-400 px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wide">
                  Recomendado
                </div>
              )}

              <div className="space-y-4">
                {/* Card Title & Icon */}
                <div className="flex items-start space-x-3.5">
                  <div className="p-3 rounded-lg bg-[#1E1E1F] text-blue-400 border border-[#333] group-hover:border-blue-500/30 transition-colors">
                    {getTemplateIcon(tmpl.iconName)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors font-display">
                      {tmpl.name}
                    </h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`inline-block text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border ${tmpl.badgeColor}`}>
                        {tmpl.category}
                      </span>
                      <span className="text-[10px] text-gray-500 font-mono">
                        {tmpl.routes.length} rotas prontas
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-gray-400 leading-relaxed">
                  {tmpl.description}
                </p>

                {/* Routes Mapping */}
                <div className="space-y-2 pt-2 border-t border-[#333]/50">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 block">
                    Mapeamento de Rotas
                  </span>
                  
                  <div className="grid grid-cols-1 gap-1.5">
                    {tmpl.routes.map((rt, idx) => {
                      const routeId = `${tmpl.id}-${rt.method}-${rt.path}`;
                      const isExpanded = expandedPreviewRouteId === routeId;

                      return (
                        <div key={idx} className="bg-[#1E1E1F] border border-[#2D2D2D] rounded-lg overflow-hidden">
                          {/* Route Row Header */}
                          <div
                            onClick={() => setExpandedPreviewRouteId(isExpanded ? null : routeId)}
                            className="flex items-center justify-between p-2 cursor-pointer hover:bg-[#232324] transition-colors"
                          >
                            <div className="flex items-center space-x-2.5 min-w-0">
                              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                rt.method === "GET"
                                  ? "bg-green-950/50 text-green-400 border border-green-900/30"
                                  : rt.method === "POST"
                                  ? "bg-blue-950/50 text-blue-400 border border-blue-900/30"
                                  : "bg-amber-950/50 text-amber-400 border-amber-900/30"
                              }`}>
                                {rt.method}
                              </span>
                              <span className="text-xs font-mono text-[#DCDCAA] truncate">
                                {rt.path}
                              </span>
                            </div>

                            <div className="flex items-center space-x-2">
                              <span className="text-[9px] font-mono text-teal-400 bg-teal-950/30 px-1.5 rounded border border-teal-900/20">
                                {rt.status}
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5 text-gray-500" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                              )}
                            </div>
                          </div>

                          {/* Route Expanded Mock Code Body */}
                          {isExpanded && (
                            <div className="p-3 border-t border-[#2D2D2D] bg-[#151516] font-mono text-[10px] text-gray-300 overflow-x-auto relative">
                              <div className="absolute top-2 right-2 flex items-center space-x-1.5">
                                <span className="text-[8px] uppercase tracking-wider text-gray-500 font-sans font-bold flex items-center">
                                  <FileCode className="w-3 h-3 mr-1" /> Mock Response Body
                                </span>
                              </div>
                              <pre className="text-gray-400 leading-relaxed overflow-x-auto pt-4 max-h-48 scrollbar-thin">
                                {rt.responseBody}
                              </pre>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-3 border-t border-[#333]/40 flex items-center justify-between">
                <span className="text-[10px] text-gray-500 italic">
                  Clique na rota acima para pré-visualizar o JSON
                </span>
                <button
                  onClick={() => onInstantiate(tmpl)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-1.5 px-4 rounded-lg transition-all flex items-center space-x-2 shadow-md shadow-blue-500/10 cursor-pointer hover:shadow-blue-500/20 active:scale-[0.98]"
                >
                  <Plus className="w-4 h-4" />
                  <span>Instanciar Mock</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Internal icon proxy helper for the design layout
const Server: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="20" height="8" x="2" y="2" rx="2" ry="2" />
    <rect width="20" height="8" x="2" y="14" rx="2" ry="2" />
    <line x1="6" x2="6.01" y1="6" y2="6" />
    <line x1="6" x2="6.01" y1="18" y2="18" />
    <line x1="10" x2="10.01" y1="6" y2="6" />
    <line x1="10" x2="10.01" y1="18" y2="18" />
  </svg>
);
