import React, { useState } from 'react';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  Plus,
  Search,
  Filter,
  GripVertical,
  Clock,
  User,
  CheckCircle2,
  Circle,
  AlertCircle,
  Edit2,
  Trash2
} from 'lucide-react';
import { mockTarefas, mockProjetos, STATUS_TAREFA, ETAPAS_PROJETO } from '../data/mock';
import './TarefasLista.css';

const TarefasLista = () => {
  const [tarefas, setTarefas] = useState(mockTarefas);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterProjeto, setFilterProjeto] = useState('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTarefa, setEditingTarefa] = useState(null);
  const [formData, setFormData] = useState({
    titulo: '',
    projeto_id: '',
    responsavel: '',
    prazo: '',
    status: 'Pendente'
  });

  const kanbanColumns = [
    { id: 'Pendente', title: 'Pendente', color: '#64748b' },
    { id: 'Em Andamento', title: 'Em Andamento', color: '#3b82f6' },
    { id: 'Concluído', title: 'Concluído', color: '#10b981' }
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Concluído': return <CheckCircle2 size={14} className="text-green-500" />;
      case 'Em Andamento': return <AlertCircle size={14} className="text-blue-500" />;
      default: return <Circle size={14} className="text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'Pendente': { bg: '#f1f5f9', color: '#64748b' },
      'Em Andamento': { bg: '#dbeafe', color: '#1d4ed8' },
      'Concluído': { bg: '#dcfce7', color: '#15803d' }
    };
    return colors[status] || { bg: '#f1f5f9', color: '#64748b' };
  };

  const getProjetoNome = (projetoId) => {
    const projeto = mockProjetos.find(p => p.id === projetoId);
    return projeto?.cliente || 'Projeto';
  };

  const isOverdue = (prazo) => {
    return new Date(prazo) < new Date();
  };

  const filteredTarefas = tarefas.filter(tarefa => {
    const matchesSearch = tarefa.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          tarefa.responsavel.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'todos' || tarefa.status === filterStatus;
    const matchesProjeto = filterProjeto === 'todos' || tarefa.projeto_id === filterProjeto;
    return matchesSearch && matchesStatus && matchesProjeto;
  });

  const getTarefasByStatus = (status) => {
    return filteredTarefas.filter(t => t.status === status);
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const { draggableId, destination } = result;
    const newStatus = destination.droppableId;

    setTarefas(tarefas.map(t => 
      t.id === draggableId ? { ...t, status: newStatus } : t
    ));
  };

  const handleOpenModal = (tarefa = null) => {
    if (tarefa) {
      setEditingTarefa(tarefa);
      setFormData({
        titulo: tarefa.titulo,
        projeto_id: tarefa.projeto_id,
        responsavel: tarefa.responsavel,
        prazo: tarefa.prazo,
        status: tarefa.status
      });
    } else {
      setEditingTarefa(null);
      setFormData({
        titulo: '',
        projeto_id: '',
        responsavel: '',
        prazo: '',
        status: 'Pendente'
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (editingTarefa) {
      setTarefas(tarefas.map(t => 
        t.id === editingTarefa.id ? { ...t, ...formData } : t
      ));
    } else {
      const newTarefa = {
        id: 'tarefa-' + Date.now(),
        ...formData,
        etapa: 'Lançamento',
        macro_etapa: 'PRE_PRODUCAO',
        atividade: formData.titulo,
        critica: false,
        setor: 'Geral'
      };
      setTarefas([...tarefas, newTarefa]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta tarefa?')) {
      setTarefas(tarefas.filter(t => t.id !== id));
    }
  };

  const handleStatusChange = (tarefaId, newStatus) => {
    setTarefas(tarefas.map(t => 
      t.id === tarefaId ? { ...t, status: newStatus } : t
    ));
  };

  return (
    <Layout>
      <div className="tarefas-container">
        {/* Header */}
        <div className="tarefas-header">
          <div className="header-left">
            <h2 className="page-subtitle">Kanban de Tarefas</h2>
            <p className="page-description">Arraste e solte para mover tarefas entre colunas</p>
          </div>
          <Button className="add-button" onClick={() => handleOpenModal()}>
            <Plus size={18} />
            Nova Tarefa
          </Button>
        </div>

        {/* Filters */}
        <div className="filters-bar">
          <div className="search-wrapper">
            <Search size={18} className="search-icon" />
            <Input
              type="text"
              placeholder="Buscar por título ou responsável..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="filter-selects">
            <Select value={filterProjeto} onValueChange={setFilterProjeto}>
              <SelectTrigger className="filter-select">
                <SelectValue placeholder="Projeto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Projetos</SelectItem>
                {mockProjetos.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.cliente}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="filter-select">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Status</SelectItem>
                <SelectItem value="Pendente">Pendente</SelectItem>
                <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                <SelectItem value="Concluído">Concluído</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Kanban Board */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="kanban-board">
            {kanbanColumns.map(column => (
              <div key={column.id} className="kanban-column">
                <div 
                  className="column-header"
                  style={{ borderColor: column.color }}
                >
                  <span 
                    className="column-indicator"
                    style={{ backgroundColor: column.color }}
                  ></span>
                  <h3>{column.title}</h3>
                  <Badge variant="secondary" className="column-count">
                    {getTarefasByStatus(column.id).length}
                  </Badge>
                </div>
                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div 
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`column-content ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                    >
                      {getTarefasByStatus(column.id).map((tarefa, index) => (
                        <Draggable key={tarefa.id} draggableId={tarefa.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`tarefa-card ${snapshot.isDragging ? 'dragging' : ''} ${isOverdue(tarefa.prazo) && tarefa.status !== 'Concluído' ? 'overdue' : ''}`}
                            >
                              <div className="tarefa-drag-handle" {...provided.dragHandleProps}>
                                <GripVertical size={16} />
                              </div>
                              <div className="tarefa-content">
                                <div className="tarefa-header">
                                  <span className="tarefa-titulo">{tarefa.titulo}</span>
                                  {tarefa.critica && (
                                    <Badge variant="destructive" className="critica-badge">Crítica</Badge>
                                  )}
                                </div>
                                <span className="tarefa-projeto">{getProjetoNome(tarefa.projeto_id)}</span>
                                <div className="tarefa-meta">
                                  <span className="tarefa-responsavel">
                                    <User size={12} />
                                    {tarefa.responsavel}
                                  </span>
                                  <span className={`tarefa-prazo ${isOverdue(tarefa.prazo) && tarefa.status !== 'Concluído' ? 'overdue' : ''}`}>
                                    <Clock size={12} />
                                    {new Date(tarefa.prazo).toLocaleDateString('pt-BR')}
                                  </span>
                                </div>
                                <div className="tarefa-actions">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleOpenModal(tarefa)}
                                  >
                                    <Edit2 size={14} />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="delete-btn"
                                    onClick={() => handleDelete(tarefa.id)}
                                  >
                                    <Trash2 size={14} />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>

        {/* Modal de Criar/Editar */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="tarefa-modal">
            <DialogHeader>
              <DialogTitle>
                {editingTarefa ? 'Editar Tarefa' : 'Nova Tarefa'}
              </DialogTitle>
            </DialogHeader>
            <div className="modal-form">
              <div className="form-group">
                <Label>Título</Label>
                <Input
                  value={formData.titulo}
                  onChange={(e) => setFormData({...formData, titulo: e.target.value})}
                  placeholder="Título da tarefa"
                />
              </div>
              <div className="form-group">
                <Label>Projeto</Label>
                <Select 
                  value={formData.projeto_id} 
                  onValueChange={(value) => setFormData({...formData, projeto_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o projeto" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockProjetos.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.cliente}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <Label>Responsável</Label>
                  <Input
                    value={formData.responsavel}
                    onChange={(e) => setFormData({...formData, responsavel: e.target.value})}
                    placeholder="Nome do responsável"
                  />
                </div>
                <div className="form-group">
                  <Label>Prazo</Label>
                  <Input
                    type="date"
                    value={formData.prazo}
                    onChange={(e) => setFormData({...formData, prazo: e.target.value})}
                  />
                </div>
              </div>
              <div className="form-group">
                <Label>Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value) => setFormData({...formData, status: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pendente">Pendente</SelectItem>
                    <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                    <SelectItem value="Concluído">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                {editingTarefa ? 'Salvar' : 'Criar Tarefa'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default TarefasLista;
