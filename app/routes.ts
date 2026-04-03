import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  index("routes/landing.tsx"),
  route("login", "routes/login.tsx"),
  route("register", "routes/register.tsx"),
  route("teste", "routes/teste.tsx"),
  layout("components/layout/Layout.tsx", [
    route("dashboard", "routes/dashboard.tsx"),
    route("vendas", "routes/vendas.tsx"),
    route("vendas/nova", "routes/vendas.nova.tsx"),
    route("produtos", "routes/produtos.tsx"),
    route("produtos/novo", "routes/produtos.novo.tsx"),
    route("produtos/:id/editar", "routes/produtos.editar.tsx"),
    route("clientes", "routes/clientes.tsx"),
    route("clientes/novo", "routes/clientes.novo.tsx"),
    route("meus-clientes", "routes/meus-clientes.tsx"),
    route("despesas", "routes/despesas.tsx"),
    route("despesas/nova", "routes/despesas.nova.tsx"),
    route("usuarios", "routes/usuarios.tsx"),
    route("historico", "routes/historico.tsx"),
    route("conta", "routes/conta.tsx"),
  ]),
] satisfies RouteConfig;
