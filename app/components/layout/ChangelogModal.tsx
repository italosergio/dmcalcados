import { useState } from 'react';
import { X, ChevronDown, ChevronRight, Tag } from 'lucide-react';

export const APP_VERSION = 'v0.11.2';

interface VersionEntry {
  version: string;
  items: string[];
}

const changelog: VersionEntry[] = [
  {
    version: 'v0.11.2',
    items: [
      'Login e troca de conta redirecionam para o Painel Administrativo',
    ],
  },
  {
    version: 'v0.11.1',
    items: [
      'Botão da landing page redireciona para Painel Administrativo ao invés de Vendas',
      'Clique na logo quando logado também vai para o Painel Administrativo',
    ],
  },
  {
    version: 'v0.11.0',
    items: [
      'Carrossel com slides de ciclos, clientes, condições de pagamento e sparklines',
      'Busca e filtro nos cards de navegação',
      'Modal de ciclo acessível direto do carrossel',
    ],
  },
  {
    version: 'v0.10.13',
    items: [
      'Carrossel de destaques com gráficos de vendas e ranking de modelos',
      'Navegação por setas e progress bars com auto-play e pausa no hover',
    ],
  },
  {
    version: 'v0.10.12',
    items: [
      'Nova página Painel com grid de cards de navegação por role',
      'Cards com imagens de fundo, ícones e descrições por seção',
    ],
  },
  {
    version: 'v0.10.11',
    items: [
      'Background CSS neon moderno para cards de dashboard e clientes',
    ],
  },
  {
    version: 'v0.10.10',
    items: [
      'Despesas agrupadas por dia com gráfico de barras por tipo e cores temáticas',
      'Modal de dia com lista de despesas e botão de adicionar com data correta',
    ],
  },
  {
    version: 'v0.10.9',
    items: [
      'Despesas por dia colapsável no modal do ciclo com caixa interno acumulado',
    ],
  },
  {
    version: 'v0.10.8',
    items: [
      'Estoque restante exibido em pacotes no demonstrativo do ciclo',
      'Corrige contagem de pacotes quando venda é registrada em unidades',
      'Dashboard padrão alterado para 30 dias',
      'Filtros de despesas com quebra de linha agrupada',
      'Melhorias gerais em ciclos, vendas, estoque, depósitos e produtos',
    ],
  },
  {
    version: 'v0.10.7',
    items: [
      'Versão exibida no footer da landing page com link para changelog',
      'Logo da landing page reduzida para ocupar menos espaço',
      'Regra de versionamento automático nos commits',
    ],
  },
  {
    version: 'v0.10.6',
    items: [
      'Corrige cálculo de unidades no estoque (pacote × 15)',
      'Período padrão do dashboard alterado para "mês"',
      'Remove stacking do gráfico de condição de pagamento',
      'Regras de banco para vales e depósitos',
    ],
  },
  {
    version: 'v0.10.5',
    items: [
      'Clientes: validação relaxada para admin (CPF, endereço, contato opcionais)',
      'Links WhatsApp nos contatos do cliente',
      'Botão de apagar cliente (triple click)',
    ],
  },
  {
    version: 'v0.10.4',
    items: [
      'Dashboard financeiro nos ciclos',
      'Participantes e datas início/fim nos ciclos',
      'Reabrir ciclo fechado',
    ],
  },
  {
    version: 'v0.10.3',
    items: [
      'Fonte de pagamento nas despesas (caixa interno/externo/misto)',
      'Edição inline de despesas',
      'Modal de criação de despesa',
    ],
  },
  {
    version: 'v0.10.2',
    items: [
      'Desconto em vendas',
      'Forma de entrada (pix/dinheiro/misto)',
      'Modal de edição de vendas',
    ],
  },
  {
    version: 'v0.10.1',
    items: [
      'Novos tipos: Deposito, ValeCard, ValeRegistro, Cobranca',
      'Services de depósitos, vales e cobranças',
      'Hooks useVales e useDepositos',
      'Páginas de depósitos e vales',
      'updateVenda() e updateDespesa()',
    ],
  },
  {
    version: 'v0.10.0',
    items: [
      'Soft delete de ciclos',
      'Ordenação de colunas no estoque',
    ],
  },
  {
    version: 'v0.9.2',
    items: ['Backlog de funcionalidades de rotas'],
  },
  {
    version: 'v0.9.1',
    items: [
      'Sidebar minimizável no desktop',
      'Texto compacto para desenvolvedor',
      'Ajustes Leaflet zoom controls e estilos de mapa',
    ],
  },
  {
    version: 'v0.9.0',
    items: [
      'Serviços, utils e modelos para sistema de rotas GPX',
      'Página de rotas com mapa interativo e visualização GPX',
    ],
  },
  {
    version: 'v0.8.1',
    items: ['Regra: nunca usar emojis, sempre Lucide React'],
  },
  {
    version: 'v0.8.0',
    items: [
      'Página de acompanhamento de vendas a prazo (Pagamentos)',
      'Badges de status de pagamento nos cards e modal de clientes',
    ],
  },
  {
    version: 'v0.7.2',
    items: ['Backlog: marca itens #1, #2, #11, #12, #13 como concluídos'],
  },
  {
    version: 'v0.7.1',
    items: [
      'Melhora UX de edição e validação de clientes',
      'Padroniza proteção de rotas admin',
      'Rastreamento de login/logout e landing',
      'Filtros de tempo, foto do usuário e eventos anônimos no analytics',
      'Cards quadrados e compartilhamento colapsável em clientes',
    ],
  },
  {
    version: 'v0.7.0',
    items: ['Página de analytics e rastreamento de eventos'],
  },
  {
    version: 'v0.6.5',
    items: [
      'Fix: declaração duplicada de navigate em produtos',
      'Fix: detecção de navegação suspeita',
    ],
  },
  {
    version: 'v0.6.4',
    items: ['Modal de benefícios do ranking'],
  },
  {
    version: 'v0.6.3',
    items: [
      'Atualiza vendedorNome nas vendas ao mudar nome do perfil',
      'Desenvolvedor pode editar nome de qualquer usuário',
    ],
  },
  {
    version: 'v0.6.2',
    items: [
      'Filtro de período 60 dias em vendas e despesas',
      'Ticker migrado para hooks realtime',
      'Corrige clique no ticker no desktop',
    ],
  },
  {
    version: 'v0.6.1',
    items: ['Filtros globais sincronizam todos os gráficos do dashboard'],
  },
  {
    version: 'v0.6.0',
    items: ['Melhorias no LoginForm'],
  },
  {
    version: 'v0.5.8',
    items: [
      'CSS tokens silver, logo glow, fonte Playfair Display',
      'Atualização de database rules e regra de comunicação',
    ],
  },
  {
    version: 'v0.5.7',
    items: [
      'Melhorias na página de ciclos e hooks realtime',
      'Ajustes em vendas, estoque, produtos, landing e conta',
    ],
  },
  {
    version: 'v0.5.6',
    items: ['Clientes: edição inline, compartilhamento e suspensão no modal'],
  },
  {
    version: 'v0.5.5',
    items: ['Despesas: múltiplas imagens obrigatórias por tipo e justificativa'],
  },
  {
    version: 'v0.5.4',
    items: ['Gestão avançada de usuários: status, hierarquia e reset de senha'],
  },
  {
    version: 'v0.5.3',
    items: ['Ranking de vendedores com modal e snapshots'],
  },
  {
    version: 'v0.5.2',
    items: ['Dashboard refatorado em componentes modulares com filtros independentes'],
  },
  {
    version: 'v0.5.1',
    items: ['Sistema de multi-contas com troca rápida'],
  },
  {
    version: 'v0.5.0',
    items: [
      'Sistema de ciclos de estoque (consignação)',
      'Fix mobile dvh',
    ],
  },
  {
    version: 'v0.4.3',
    items: ['Backlog de funcionalidades e configurações de IDE'],
  },
  {
    version: 'v0.4.2',
    items: [
      'Melhorias em todas as páginas',
      'Nova página de Produtos separada',
      'Página de Entrada de Estoque',
    ],
  },
  {
    version: 'v0.4.1',
    items: [
      'Cache de formulários, novos campos e melhorias de UX',
      'ClienteModal com edição e compartilhamento',
    ],
  },
  {
    version: 'v0.4.0',
    items: [
      'Sistema multi-roles nos modelos',
      'Hooks useFormCache e useRealtime',
      'Componente ImageLightbox',
      'Multi-roles em auth e users services',
      'Clientes: dono, compartilhamento e validação de duplicatas',
      'Vendas: ajuste automático de estoque, restore e tipo pacote',
      'Despesas: rateio, restore, descrição e limpeza',
      'Rota /estoque separada de /produtos',
    ],
  },
  {
    version: 'v0.3.1',
    items: ['Estoque restrito a admin', 'Ticker adaptado por role'],
  },
  {
    version: 'v0.3.0',
    items: [
      'Redesign completo do tema visual',
      'Novo design system nos componentes base',
      'Redesign do layout, sidebar e header',
      'Redesign das páginas de autenticação e nova landing page',
      'Redesign das páginas de CRUD e dashboard',
      'Documentação detalhada de cada página',
    ],
  },
  {
    version: 'v0.2.0',
    items: [
      'Modelos expandidos com novos campos',
      'Upload de imagens via Cloudinary',
      'Serviço de entradas de estoque',
      'Expiração de sessão por role',
    ],
  },
  {
    version: 'v0.1.3',
    items: [
      'Tema dark-only (remoção do tema claro)',
      'README com documentação completa',
      'Flag --host no dev para rede local',
    ],
  },
  {
    version: 'v0.1.2',
    items: [
      'Melhora nos serviços de dados',
      'Melhora nos formulários de vendas e despesas',
      'Melhorias de UX nas páginas',
      'Atualização das regras de segurança',
    ],
  },
  {
    version: 'v0.1.1',
    items: ['Componentes comuns responsivos', 'Melhora de responsividade e tema'],
  },
  {
    version: 'v0.1.0',
    items: [
      'Soft delete em todos os serviços',
      'Páginas de Histórico e Meus Clientes',
      'Índices no banco para otimização',
    ],
  },
  {
    version: 'v0.0.7',
    items: ['Documentação do README e páginas'],
  },
  {
    version: 'v0.0.6',
    items: [
      'Configuração de rotas',
      'Root component com providers',
      'Regras de segurança do Realtime Database',
    ],
  },
  {
    version: 'v0.0.5',
    items: [
      'Páginas de Login e Registro',
      'Dashboard',
      'CRUD de Produtos, Clientes, Vendas, Despesas',
      'Gestão de Usuários',
    ],
  },
  {
    version: 'v0.0.4',
    items: ['Componentes reutilizáveis (Button, Card, Input, ResponsiveTable)'],
  },
  {
    version: 'v0.0.3',
    items: [
      'Contextos de Auth e Tema',
      'Tipos TypeScript',
      'Camada de services Firebase',
      'Funções utilitárias',
    ],
  },
  {
    version: 'v0.0.2',
    items: ['Helpers de autenticação', 'Template de variáveis de ambiente'],
  },
  {
    version: 'v0.0.1',
    items: ['Instalação do projeto (React Router 7, Vite, Tailwind)'],
  },
];

export function ChangelogModal({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState<string>(changelog[0].version);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface border border-border-subtle rounded-2xl w-[95vw] max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <Tag size={16} className="text-blue-400" />
            <h2 className="text-sm font-semibold text-content">Changelog</h2>
          </div>
          <button onClick={onClose} className="text-content-muted hover:text-content transition-colors"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-3 space-y-1">
          {changelog.map(entry => {
            const isOpen = open === entry.version;
            const isCurrent = entry.version === APP_VERSION;
            return (
              <div key={entry.version}>
                <button
                  onClick={() => setOpen(isOpen ? '' : entry.version)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${isOpen ? 'bg-blue-600/10 text-blue-400' : 'text-content-secondary hover:bg-surface-hover hover:text-content'}`}
                >
                  {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <span className="text-xs font-mono font-semibold">{entry.version}</span>
                  {isCurrent && <span className="text-[9px] bg-blue-600/20 text-blue-400 px-1.5 py-0.5 rounded-full font-medium">atual</span>}
                </button>
                {isOpen && (
                  <ul className="ml-8 mt-1 mb-2 space-y-1">
                    {entry.items.map((item, i) => (
                      <li key={i} className="text-xs text-content-muted flex items-start gap-1.5">
                        <span className="text-blue-500 mt-0.5 shrink-0">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
