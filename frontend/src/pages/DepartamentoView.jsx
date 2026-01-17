import React, { useState } from 'react';
import LayoutNovo from '../components/LayoutNovo';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Button } from '../components/ui/button';
import {
  Building2,
  Calendar,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Circle,
  User,
  Users
} from 'lucide-react';
import { mockProjetos, TODAS_ETAPAS, DEPARTAMENTOS } from '../data/mockNovo';
import './DepartamentoView.css';

const DepartamentoView = ({ departamento }) => {
  const [projetos] = useState(mockProjetos);
  
  // Encontrar info do departamento - DEPARTAMENTOS é um objeto
  const deptInfo = Object.values(DEPARTAMENTOS).find(d => d.id === departamento) || {
    id: departamento,
    nome: 'Departamento',
    cor: '#3b82f6',
    equipe: [],
    descricao: ''
  };

  // Etapas deste departamento
  const etapasDepartamento = TODAS_ETAPAS.filter(e => e.departamento === departamento);

  // Projetos ativos neste departamento
  const projetosDepartamento = projetos.filter(p => 
    p.departamento_atual === departamento && 
    p.status !== 'Concluído'
  );

  // Estatísticas
  const stats = {
    total: projetosDepartamento.length,
    emDia: projetosDepartamento.filter(p => p.dias_atraso === 0).length,
    atrasados: projetosDepartamento.filter(p => p.dias_atraso > 0).length,
    progresso: projetosDepartamento.length > 0 
      ? Math.round(projetosDepartamento.reduce((acc, p) => acc + p.progresso, 0) / projetosDepartamento.length)
      : 0
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'Atrasado': return <AlertTriangle size={16} className="status-icon atrasado" />;
      case 'Ativo': return <Clock size={16} className="status-icon ativo" />;
      case 'Concluído': return <CheckCircle2 size={16} className="status-icon concluido" />;
      default: return <Circle size={16} className="status-icon" />;
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Atrasado': return { bg: '#fee2e2', color: '#dc2626', border: '#fecaca' };
      case 'Ativo': return { bg: '#dbeafe', color: '#1d4ed8', border: '#bfdbfe' };
      case 'Concluído': return { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' };
      default: return { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' };
    }
  };

  return (
    <LayoutNovo 
      title={deptInfo.nome}
      subtitle={deptInfo.descricao}
    >
      <div className="departamento-container">
        {/* Header com estatísticas */}
        <div className="departamento-header">
          <div className="departamento-stats">
            <div className="stat-item" style={{ borderLeftColor: deptInfo.cor }}>
              <span className="stat-value">{stats.total}</span>
              <span className="stat-label">Projetos Ativos</span>
            </div>
            <div className="stat-item" style={{ borderLeftColor: '#10b981' }}>
              <span className="stat-value">{stats.emDia}</span>
              <span className="stat-label">Em Dia</span>
            </div>
            <div className="stat-item" style={{ borderLeftColor: '#ef4444' }}>
              <span className="stat-value">{stats.atrasados}</span>
              <span className="stat-label">Atrasados</span>
            </div>
            <div className="stat-item" style={{ borderLeftColor: deptInfo.cor }}>
              <span className="stat-value">{stats.progresso}%</span>
              <span className="stat-label">Progresso Médio</span>
            </div>
          </div>

          {/* Equipe */}
          {deptInfo.equipe && deptInfo.equipe.length > 0 && (
            <div className="equipe-info">
              <Users size={18} style={{ color: deptInfo.cor }} />
              <span className="equipe-label">Equipe:</span>
              <div className="equipe-members">
                {deptInfo.equipe.map((membro, index) => (
                  <Badge key={index} variant="outline" className="membro-badge">
                    {membro}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Etapas do departamento */}
        {etapasDepartamento.length > 0 && (
          <Card className="etapas-card">
            <CardContent style={{ padding: '20px' }}>
              <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 600, color: '#1e293b' }}>
                Etapas do Departamento ({etapasDepartamento.length})
              </h3>
              <div className="etapas-list">
                {etapasDepartamento.map((etapa, index) => (
                  <div key={etapa.id} className="etapa-item">
                    <div className="etapa-numero">{index + 1}</div>
                    <div className="etapa-content">
                      <span className="etapa-nome">{etapa.nome}</span>
                      {etapa.prazo_dias > 0 && (
                        <span className="etapa-prazo">
                          <Clock size={12} />
                          {etapa.prazo_dias} {etapa.prazo_dias === 1 ? 'dia' : 'dias'}
                        </span>
                      )}
                      {etapa.tipo && (
                        <Badge variant="outline" className="etapa-tipo">
                          {etapa.tipo}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lista de projetos */}
        <div className="projetos-departamento">
          <h3 className="section-title">Projetos no {deptInfo.nome}</h3>
          
          {projetosDepartamento.length === 0 ? (
            <Card className="empty-state">
              <CardContent style={{ padding: '60px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>📋</div>
                <h3 style={{ marginBottom: '8px', color: '#64748b' }}>
                  Nenhum projeto neste departamento no momento
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '14px' }}>
                  Os projetos aparecerão aqui quando estiverem na etapa deste departamento
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="projetos-grid-dept">
              {projetosDepartamento.map((projeto) => {
                const statusColor = getStatusColor(projeto.status);
                
                return (
                  <Card key={projeto.id} className="projeto-card-dept">
                    <CardContent style={{ padding: '20px' }}>
                      {/* Header */}
                      <div className="projeto-header-dept">
                        <div className="projeto-title-dept">
                          <Building2 size={18} style={{ color: deptInfo.cor }} />
                          <div>
                            <h4>{projeto.cliente}</h4>
                            <span className="projeto-instituicao">{projeto.instituicao}</span>
                          </div>
                        </div>
                        <Badge 
                          style={{ 
                            backgroundColor: statusColor.bg,
                            color: statusColor.color,
                            border: `1px solid ${statusColor.border}`
                          }}
                        >
                          {getStatusIcon(projeto.status)}
                          {projeto.status}
                        </Badge>
                      </div>

                      {/* Etapa Atual */}
                      <div className="etapa-atual-dept">
                        <div className="etapa-info-dept">
                          <span className="etapa-label-dept">Etapa Atual:</span>
                          <span className="etapa-nome-dept">{projeto.etapa_atual_nome}</span>
                        </div>
                        {projeto.dias_atraso > 0 && (
                          <Badge variant="destructive" className="atraso-badge">
                            <AlertTriangle size={12} />
                            {projeto.dias_atraso} dias de atraso
                          </Badge>
                        )}
                      </div>

                      {/* Progresso */}
                      <div className="progresso-dept">
                        <div className="progresso-header-dept">
                          <span>Progresso</span>
                          <span className="progresso-value">{projeto.progresso}%</span>
                        </div>
                        <Progress value={projeto.progresso} className="progress-bar-dept" />
                      </div>

                      {/* Informações adicionais */}
                      <div className="info-grid-dept">
                        <div className="info-item-dept">
                          <Calendar size={14} />
                          <div>
                            <span className="info-label-dept">Entrega</span>
                            <span className="info-value-dept">
                              {new Date(projeto.data_entrega).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>
                        <div className="info-item-dept">
                          <Clock size={14} />
                          <div>
                            <span className="info-label-dept">Restam</span>
                            <span className="info-value-dept">{projeto.dias_restantes} dias</span>
                          </div>
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="acoes-dept">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="btn-visualizar"
                          style={{ borderColor: deptInfo.cor, color: deptInfo.cor }}
                        >
                          Ver Detalhes
                          <ChevronRight size={16} />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </LayoutNovo>
  );
};

export default DepartamentoView;
