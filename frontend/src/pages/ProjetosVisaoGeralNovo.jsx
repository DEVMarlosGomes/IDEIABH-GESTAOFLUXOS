import React, { useState, useEffect } from 'react';
import LayoutNovo from '../components/LayoutNovo';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Input } from '../components/ui/input';
import {
  Search,
  Building2,
  Calendar,
  ChevronRight,
  Loader2,
  LayoutGrid,
  List
} from 'lucide-react';
import { getProjetos } from '../services/api';
import { toast } from 'sonner';
import './ProjetosVisaoGeral.css';

const ProjetosVisaoGeralNovo = () => {
  const [projetos, setProjetos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [viewMode, setViewMode] = useState('grid'); // grid ou list

  useEffect(() => {
    loadProjetos();
  }, []);

  const loadProjetos = async () => {
    try {
      setLoading(true);
      const data = await getProjetos();
      setProjetos(data);
    } catch (error) {
      console.error('Erro ao carregar projetos:', error);
      toast.error('Erro ao carregar projetos');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar projetos
  const projetosFiltrados = projetos.filter(projeto => {
    const matchSearch = projeto.cliente?.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchStatus = true;
    if (filterStatus === 'ativos') {
      matchStatus = projeto.status === 'Em Andamento' && !projeto.atrasado;
    } else if (filterStatus === 'atrasados') {
      matchStatus = projeto.tarefas_atrasadas > 0;
    } else if (filterStatus === 'concluidos') {
      matchStatus = projeto.progresso === 100;
    }
    
    return matchSearch && matchStatus;
  });

  // Contar por status
  const counts = {
    todos: projetos.length,
    ativos: projetos.filter(p => p.status === 'Em Andamento' && p.tarefas_atrasadas === 0).length,
    atrasados: projetos.filter(p => p.tarefas_atrasadas > 0).length,
    concluidos: projetos.filter(p => p.progresso === 100).length
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (projeto) => {
    if (projeto.progresso === 100) {
      return { label: 'Concluído', color: 'bg-green-100 text-green-800' };
    }
    if (projeto.tarefas_atrasadas > 0) {
      return { label: 'Atrasado', color: 'bg-red-100 text-red-800' };
    }
    return { label: 'Ativo', color: 'bg-blue-100 text-blue-800' };
  };

  if (loading) {
    return (
      <LayoutNovo>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="animate-spin" size={48} />
        </div>
      </LayoutNovo>
    );
  }

  return (
    <LayoutNovo>
      <div className="projetos-container">
        {/* Header */}
        <div className="projetos-header mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Visão Geral de Projetos</h1>
            <p className="text-gray-600">Acompanhe o status e atrasos de todos os projetos</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <Input
              type="text"
              placeholder="Buscar projetos, contratos, clientes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 text-base"
            />
          </div>
        </div>

        {/* Filters Tabs */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex gap-2 bg-white rounded-lg p-1 shadow-sm border">
            <button
              onClick={() => setFilterStatus('todos')}
              className={`px-6 py-2.5 rounded-md text-sm font-medium transition-all ${
                filterStatus === 'todos'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Todos ({counts.todos})
            </button>
            <button
              onClick={() => setFilterStatus('ativos')}
              className={`px-6 py-2.5 rounded-md text-sm font-medium transition-all ${
                filterStatus === 'ativos'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Ativos ({counts.ativos})
            </button>
            <button
              onClick={() => setFilterStatus('atrasados')}
              className={`px-6 py-2.5 rounded-md text-sm font-medium transition-all ${
                filterStatus === 'atrasados'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Atrasados ({counts.atrasados})
            </button>
            <button
              onClick={() => setFilterStatus('concluidos')}
              className={`px-6 py-2.5 rounded-md text-sm font-medium transition-all ${
                filterStatus === 'concluidos'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Concluídos ({counts.concluidos})
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
            >
              <LayoutGrid size={20} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
            >
              <List size={20} />
            </button>
          </div>
        </div>

        {/* Projects Grid */}
        <div className={`projects-grid ${viewMode === 'list' ? 'list-view' : ''}`}>
          {projetosFiltrados.map((projeto) => {
            const statusBadge = getStatusBadge(projeto);
            
            return (
              <Card key={projeto.id} className="project-card">
                <CardContent className="p-6">
                  {/* Header com título e badge */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {projeto.cliente}
                      </h3>
                      <div className="flex items-center text-gray-600 text-sm">
                        <Building2 size={16} className="mr-1.5" />
                        <span>UFMG</span>
                      </div>
                    </div>
                    <Badge className={`${statusBadge.color} px-3 py-1 text-sm font-medium`}>
                      {statusBadge.label}
                    </Badge>
                  </div>

                  {/* Etapa atual */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="text-sm text-gray-600 mb-1">Etapa atual:</div>
                    <div className="font-medium text-gray-900">{projeto.etapa_atual}</div>
                  </div>

                  {/* Progresso */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Progresso geral</span>
                      <span className="text-sm font-bold text-gray-900">{projeto.progresso}%</span>
                    </div>
                    <Progress value={projeto.progresso} className="h-2" />
                  </div>

                  {/* Footer com data e botão */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar size={16} className="mr-1.5" />
                      <span>Entrega: {formatDate(projeto.data_fim_prevista)}</span>
                    </div>
                    <Button 
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => window.location.href = `/projetos/${projeto.id}`}
                    >
                      Ver detalhes
                      <ChevronRight size={16} className="ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Empty State */}
        {projetosFiltrados.length === 0 && (
          <div className="text-center py-20">
            <div className="text-gray-400 mb-4">
              <LayoutGrid size={64} className="mx-auto" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Nenhum projeto encontrado
            </h3>
            <p className="text-gray-600">
              Tente ajustar os filtros ou busque por outro termo
            </p>
          </div>
        )}
      </div>

      <style jsx>{`
        .projetos-container {
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        .projects-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
          gap: 1.5rem;
        }

        .projects-grid.list-view {
          grid-template-columns: 1fr;
        }

        .project-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          transition: all 0.2s ease;
          height: 100%;
        }

        .project-card:hover {
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.08);
          transform: translateY(-2px);
        }

        @media (max-width: 768px) {
          .projetos-container {
            padding: 1rem;
          }

          .projects-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
        }
      `}</style>
    </Layout>
  );
};

export default ProjetosVisaoGeralNovo;
