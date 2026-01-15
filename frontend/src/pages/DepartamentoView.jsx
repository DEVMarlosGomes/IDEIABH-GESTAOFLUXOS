import React, { useState } from 'react';
import LayoutNovo from '../components/LayoutNovo';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Button } from '../components/ui/button';
import { Checkbox } from '../components/ui/checkbox';
import {
  Building2,
  Calendar,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Circle,
  User
} from 'lucide-react';
import { mockProjetos, ETAPAS_SISTEMA, DEPARTAMENTOS } from '../data/mockNovo';
import './DepartamentoView.css';

const DepartamentoView = ({ departamento }) => {
  const [projetos] = useState(mockProjetos);
  const [tarefasConcluidas, setTarefasConcluidas] = useState([]);

  // Encontrar info do departamento
  const deptInfo = DEPARTAMENTOS.find(d => d.id === departamento) || {
    nome: 'Departamento',
    cor: '#3b82f6'
  };

  // Etapas deste departamento
  const etapasDepartamento = ETAPAS_SISTEMA.filter(e => 
    e.departamento.toLowerCase().replace(/ã/g, 'a').replace(/-/g, '-') === 
    deptInfo.nome.toLowerCase().replace(/ã/g, 'a')
  );

  // Projetos com tarefas neste departamento
  const projetosComTarefas = projetos.filter(p => {
    const etapaAtual = p.etapas.find(e => e.id === p.etapa_atual);
    if (!etapaAtual) return false;
    const etapaSistema = ETAPAS_SISTEMA.find(es => es.id === etapaAtual.id);
    return etapaSistema?.departamento.toLowerCase().includes(deptInfo.nome.toLowerCase().split(' ')[0].toLowerCase());
  });

  // Clientes nesta etapa (todos os projetos que passam por etapas deste departamento)
  const clientesNaEtapa = projetos.filter(p => {
    return p.etapas.some(e => {
      const etapaSistema = ETAPAS_SISTEMA.find(es => es.id === e.id);
      return etapaSistema?.departamento.toLowerCase().includes(deptInfo.nome.toLowerCase().split(' ')[0].toLowerCase()) &&
             (e.status === 'Em Andamento' || e.status === 'Atrasada');
    });
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const toggleTarefa = (tarefaId) => {
    setTarefasConcluidas(prev => 
      prev.includes(tarefaId) 
        ? prev.filter(id => id !== tarefaId)
        : [...prev, tarefaId]
    );
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Atrasado': case 'Atrasada': return { bg: '#fee2e2', color: '#dc2626' };
      case 'Em Andamento': return { bg: '#dbeafe', color: '#1d4ed8' };
      case 'Concluído': case 'Concluída': return { bg: '#dcfce7', color: '#15803d' };
      default: return { bg: '#f1f5f9', color: '#475569' };
    }
  };

  return (
    <LayoutNovo 
      title={deptInfo.nome} 
      subtitle={`Gerencie as tarefas e acompanhe os clientes nesta etapa`}
    >
      <div className="departamento-container">
        {/* Layout de 2 Colunas */}
        <div className="departamento-grid">
          {/* Coluna Esquerda - Tarefas do Departamento */}
          <div className="coluna-tarefas">
            <Card className="tarefas-card">
              <div className="tarefas-header" style={{ borderColor: deptInfo.cor }}>
                <h3>Tarefas do Departamento</h3>
                <Badge variant="secondary">
                  {etapasDepartamento.length} etapas
                </Badge>
              </div>
              <CardContent className="tarefas-content">
                {etapasDepartamento.map((etapa) => {
                  const tarefaId = `etapa-${etapa.id}`;
                  const isConcluida = tarefasConcluidas.includes(tarefaId);
                  
                  // Contar projetos nesta etapa específica
                  const projetosNaEtapa = projetos.filter(p => {
                    const etapaAtual = p.etapas.find(e => e.id === etapa.id);
                    return etapaAtual && (etapaAtual.status === 'Em Andamento' || etapaAtual.status === 'Atrasada');
                  });

                  return (
                    <div 
                      key={etapa.id} 
                      className={`tarefa-item ${isConcluida ? 'concluida' : ''}`}
                    >
                      <div className="tarefa-check">
                        <Checkbox 
                          checked={isConcluida}
                          onCheckedChange={() => toggleTarefa(tarefaId)}
                        />
                      </div>
                      <div className="tarefa-info">
                        <span className="tarefa-nome">
                          {etapa.id} - {etapa.nome}
                        </span>
                        <span className="tarefa-duracao">
                          <Clock size={12} />
                          {etapa.duracao_padrao} dias padrão
                        </span>
                      </div>
                      {projetosNaEtapa.length > 0 && (
                        <Badge 
                          className="projetos-badge"
                          style={{ backgroundColor: deptInfo.cor + '20', color: deptInfo.cor }}
                        >
                          {projetosNaEtapa.length} projeto{projetosNaEtapa.length > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Coluna Direita - Clientes nesta Etapa */}
          <div className="coluna-clientes">
            <Card className="clientes-card">
              <div className="clientes-header" style={{ borderColor: deptInfo.cor }}>
                <h3>Clientes nesta Etapa</h3>
                <Badge variant="secondary">
                  {clientesNaEtapa.length} cliente{clientesNaEtapa.length !== 1 ? 's' : ''}
                </Badge>
              </div>
              <CardContent className="clientes-content">
                {clientesNaEtapa.length === 0 ? (
                  <div className="empty-clientes">
                    <p>Nenhum cliente nesta etapa no momento.</p>
                  </div>
                ) : (
                  clientesNaEtapa.map((projeto) => {
                    const etapaAtual = projeto.etapas.find(e => e.id === projeto.etapa_atual);
                    const statusColor = getStatusColor(projeto.status);

                    return (
                      <div key={projeto.id} className="cliente-card">
                        <div className="cliente-header">
                          <div className="cliente-info">
                            <h4 className="cliente-nome">{projeto.cliente}</h4>
                            <span className="cliente-instituicao">
                              <Building2 size={12} />
                              {projeto.instituicao}
                            </span>
                          </div>
                          <Badge 
                            style={{ backgroundColor: statusColor.bg, color: statusColor.color }}
                          >
                            {projeto.status === 'Atrasado' && <AlertTriangle size={12} />}
                            {projeto.status}
                          </Badge>
                        </div>

                        <div className="cliente-etapa">
                          <span className="etapa-label">Etapa atual:</span>
                          <span className="etapa-nome">{projeto.etapa_atual_nome}</span>
                        </div>

                        {etapaAtual && (
                          <div className="cliente-meta">
                            <span className="meta-item">
                              <User size={12} />
                              {etapaAtual.responsavel}
                            </span>
                            <span className="meta-item">
                              <Calendar size={12} />
                              Até {formatDate(etapaAtual.data_prevista_fim)}
                            </span>
                          </div>
                        )}

                        {projeto.dias_atraso > 0 && (
                          <div className="atraso-alert">
                            <AlertTriangle size={14} />
                            <span><strong>{projeto.dias_atraso} dias</strong> de atraso</span>
                          </div>
                        )}

                        <div className="cliente-progresso">
                          <div className="progresso-header">
                            <span>Progresso geral</span>
                            <span className="progresso-percent">{projeto.progresso}%</span>
                          </div>
                          <Progress value={projeto.progresso} className="progresso-bar" />
                        </div>

                        <button className="ver-projeto-btn">
                          Ver projeto completo
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </LayoutNovo>
  );
};

export default DepartamentoView;
