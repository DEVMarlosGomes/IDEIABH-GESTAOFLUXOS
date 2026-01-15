import React, { useState } from 'react';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Grid3X3,
  List,
  ChevronRight,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Play,
  Building2
} from 'lucide-react';
import { mockProjetos, MACRO_ETAPAS, NIVEIS_RISCO } from '../data/mock';
import './ProjetosLista.css';

const ProjetosLista = () => {
  const [projetos, setProjetos] = useState(mockProjetos);
  const [viewMode, setViewMode] = useState('esteira');

  const getRiscoInfo = (risco) => {
    return NIVEIS_RISCO[risco.toUpperCase()] || { label: risco, cor: '#94a3b8' };
  };

  const getCriticidade = (diasRestantes) => {
    if (diasRestantes <= 7) return { label: 'CRÍTICO', cor: '#ef4444', bgCor: '#fef2f2' };
    if (diasRestantes <= 15) return { label: 'ATENÇÃO', cor: '#f59e0b', bgCor: '#fffbeb' };
    return { label: 'NORMAL', cor: '#10b981', bgCor: '#ecfdf5' };
  };

  const getProjetosByMacroEtapa = (macroEtapa) => {
    const etapas = MACRO_ETAPAS[macroEtapa]?.etapas || [];
    return projetos.filter(p => 
      etapas.some(e => p.etapa_atual.toLowerCase().includes(e.toLowerCase())) ||
      p.macro_etapa === macroEtapa
    );
  };

  const handleAvancarEtapa = (projetoId) => {
    // Mock: move to next stage
    setProjetos(projetos.map(p => {
      if (p.id === projetoId) {
        return { ...p, progresso: Math.min(p.progresso + 15, 100) };
      }
      return p;
    }));
  };

  const ProjetoCard = ({ projeto }) => {
    const riscoInfo = getRiscoInfo(projeto.risco);
    const criticidade = getCriticidade(projeto.dias_restantes);

    return (
      <Card className="projeto-card">
        <CardContent className="projeto-card-content">
          <div className="projeto-card-header">
            <div className="projeto-info">
              <h3 className="projeto-cliente">{projeto.cliente}</h3>
              <span className="projeto-faculdade">
                <Building2 size={12} />
                {projeto.faculdade}
              </span>
            </div>
            <Badge 
              className="risco-badge"
              style={{ 
                backgroundColor: riscoInfo.cor + '20',
                color: riscoInfo.cor
              }}
            >
              {projeto.risco}
            </Badge>
          </div>

          <div className="projeto-etapa-info">
            <span className="etapa-label">Etapa atual:</span>
            <span className="etapa-value">{projeto.etapa_atual}</span>
          </div>

          <div className="projeto-progress-section">
            <div className="progress-header">
              <span>Progresso</span>
              <span className="progress-percent">{projeto.progresso}%</span>
            </div>
            <Progress value={projeto.progresso} className="projeto-progress-bar" />
          </div>

          <div className="projeto-footer">
            <div 
              className="criticidade-badge"
              style={{ 
                backgroundColor: criticidade.bgCor,
                color: criticidade.cor
              }}
            >
              <Clock size={12} />
              {projeto.dias_restantes > 0 ? (
                <span>{projeto.dias_restantes} dias</span>
              ) : (
                <span>Concluído</span>
              )}
            </div>
            {projeto.progresso < 100 && (
              <Button 
                size="sm" 
                className="avancar-btn"
                onClick={() => handleAvancarEtapa(projeto.id)}
              >
                <Play size={14} />
                Avançar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Layout>
      <div className="projetos-container">
        {/* Header */}
        <div className="projetos-header">
          <div className="header-left">
            <h2 className="page-subtitle">Esteira de Projetos</h2>
            <p className="page-description">Acompanhe o progresso dos projetos em tempo real</p>
          </div>
          <div className="view-toggle">
            <button 
              className={`toggle-btn ${viewMode === 'esteira' ? 'active' : ''}`}
              onClick={() => setViewMode('esteira')}
            >
              <Grid3X3 size={18} />
              Esteira
            </button>
            <button 
              className={`toggle-btn ${viewMode === 'lista' ? 'active' : ''}`}
              onClick={() => setViewMode('lista')}
            >
              <List size={18} />
              Lista
            </button>
          </div>
        </div>

        {/* Legenda de Criticidade */}
        <div className="criticidade-legenda">
          <span className="legenda-title">Indicadores de prazo:</span>
          <div className="legenda-items">
            <div className="legenda-item">
              <span className="legenda-dot" style={{ backgroundColor: '#ef4444' }}></span>
              <span>&lt; 7 dias (Crítico)</span>
            </div>
            <div className="legenda-item">
              <span className="legenda-dot" style={{ backgroundColor: '#f59e0b' }}></span>
              <span>8-15 dias (Atenção)</span>
            </div>
            <div className="legenda-item">
              <span className="legenda-dot" style={{ backgroundColor: '#10b981' }}></span>
              <span>&gt; 15 dias (Normal)</span>
            </div>
          </div>
        </div>

        {viewMode === 'esteira' ? (
          /* Visão Esteira - 3 Colunas */
          <div className="esteira-container">
            {Object.entries(MACRO_ETAPAS).map(([key, macro]) => {
              const projetosMacro = getProjetosByMacroEtapa(key);
              return (
                <div key={key} className="esteira-coluna">
                  <div 
                    className="coluna-header"
                    style={{ borderColor: macro.cor }}
                  >
                    <span 
                      className="coluna-indicador"
                      style={{ backgroundColor: macro.cor }}
                    ></span>
                    <h3>{macro.titulo}</h3>
                    <Badge variant="secondary" className="coluna-count">
                      {projetosMacro.length}
                    </Badge>
                  </div>
                  <div className="coluna-content">
                    {projetosMacro.map(projeto => (
                      <ProjetoCard key={projeto.id} projeto={projeto} />
                    ))}
                    {projetosMacro.length === 0 && (
                      <div className="empty-coluna">
                        <p>Nenhum projeto nesta etapa</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Visão Lista */
          <div className="lista-container">
            <div className="lista-header">
              <span className="lista-col cliente-col">Cliente</span>
              <span className="lista-col etapa-col">Etapa</span>
              <span className="lista-col progresso-col">Progresso</span>
              <span className="lista-col risco-col">Risco</span>
              <span className="lista-col prazo-col">Prazo</span>
              <span className="lista-col acoes-col">Ações</span>
            </div>
            {projetos.map(projeto => {
              const riscoInfo = getRiscoInfo(projeto.risco);
              return (
                <div key={projeto.id} className="lista-item">
                  <div className="lista-col cliente-col">
                    <span className="cliente-nome">{projeto.cliente}</span>
                    <span className="cliente-faculdade">{projeto.faculdade}</span>
                  </div>
                  <div className="lista-col etapa-col">
                    <span>{projeto.etapa_atual}</span>
                  </div>
                  <div className="lista-col progresso-col">
                    <Progress value={projeto.progresso} className="lista-progress" />
                    <span className="progresso-text">{projeto.progresso}%</span>
                  </div>
                  <div className="lista-col risco-col">
                    <Badge 
                      style={{ 
                        backgroundColor: riscoInfo.cor + '20',
                        color: riscoInfo.cor
                      }}
                    >
                      {projeto.risco}
                    </Badge>
                  </div>
                  <div className="lista-col prazo-col">
                    <span>{projeto.dias_restantes} dias</span>
                  </div>
                  <div className="lista-col acoes-col">
                    <Button size="sm" variant="ghost">
                      <ChevronRight size={18} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ProjetosLista;
