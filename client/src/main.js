import { createApp } from "vue";
import { createRouter, createWebHistory } from "vue-router";
import App from "./App.vue";
import "./style.css";
import AppShell from "./components/AppShell.vue";
import DashboardPage from "./pages/DashboardPage.vue";
import LoginPage from "./pages/LoginPage.vue";
import SessionLogsPage from "./pages/SessionLogsPage.vue";
import UsersPage from "./pages/UsersPage.vue";

const routes = [
  { path: "/login", component: LoginPage, meta: { public: true } },
  {
    path: "/",
    component: AppShell,
    children: [
      { path: "", component: DashboardPage },
      { path: "users", component: UsersPage },
      { path: "sessions", component: SessionLogsPage }
    ]
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach(async (to) => {
  if (to.meta.public) {
    return true;
  }

  // Every private page verifies the server-side session cookie before entering.
  const response = await fetch("/api/auth/me", {
    credentials: "include"
  });

  if (response.status === 401) {
    return "/login";
  }

  return true;
});

// App.vue only renders the current route, so the router is the real frontend skeleton.
createApp(App).use(router).mount("#app");
