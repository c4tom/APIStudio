import { MockServer } from "../types";

export interface MockTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  iconName: string;
  badgeColor: string;
  routes: Array<{
    method: string;
    path: string;
    status: number;
    headers: Array<{ key: string; value: string; enabled: boolean }>;
    responseBody: string;
  }>;
}

export const mockTemplates: MockTemplate[] = [
  {
    id: "template-jsonplaceholder",
    name: "JSONPlaceholder Fake API",
    category: "Data Simulation",
    description: "Matches standard mock datasets like /posts, /comments, and /users for quick frontend prototyping.",
    iconName: "Database",
    badgeColor: "bg-blue-950/50 text-blue-400 border-blue-800",
    routes: [
      {
        method: "GET",
        path: "/posts",
        status: 200,
        headers: [{ key: "Content-Type", value: "application/json", enabled: true }],
        responseBody: JSON.stringify([
          { id: 1, title: "Sunt aut facere repellat provident", body: "Quia et suscipit suscipit recusandae consequuntur expedita et cum reprehenderit molestiae ut ut quas totam nostrum rerum est autem sunt rem eveniet architecto." },
          { id: 2, title: "Qui est esse", body: "Est rerum tempore vitae sequi sint nihil reprehenderit dolor beatae ea dolores neque fugiat blanditiis voluptate porro vel nihil molestiae ut reiciendis." },
          { id: 3, title: "Ea molestias quasi exercitationem", body: "Et iusto sed quo iure voluptatem occaecati omnis eligendi aut ad voluptatem doloribus vel accusantium quis pariatur molestiae porro eius." }
        ], null, 2)
      },
      {
        method: "GET",
        path: "/users",
        status: 200,
        headers: [{ key: "Content-Type", value: "application/json", enabled: true }],
        responseBody: JSON.stringify([
          { id: 1, name: "Leanne Graham", username: "Bret", email: "Sincere@april.biz", phone: "1-770-736-8031 x56442" },
          { id: 2, name: "Ervin Howell", username: "Antonette", email: "Shanna@melissa.tv", phone: "010-692-6593 x09125" }
        ], null, 2)
      },
      {
        method: "POST",
        path: "/posts",
        status: 201,
        headers: [{ key: "Content-Type", value: "application/json", enabled: true }],
        responseBody: JSON.stringify({ id: 101, title: "New Mock Post", body: "Successfully created mock post.", userId: 1 }, null, 2)
      }
    ]
  },
  {
    id: "template-jwt-auth",
    name: "JWT Authentication & User Profile",
    category: "Security & Identity",
    description: "Fully configured mock routes for user logins, JWT token exchange, registrations, and secure profile endpoints.",
    iconName: "Shield",
    badgeColor: "bg-purple-950/50 text-purple-400 border-purple-800",
    routes: [
      {
        method: "POST",
        path: "/auth/login",
        status: 200,
        headers: [{ key: "Content-Type", value: "application/json", enabled: true }],
        responseBody: JSON.stringify({
          success: true,
          message: "Login authorized",
          token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c3JfMGExMmIiLCJleHAiOjE4OTM0NTYwMDB9.s1G91jA8K",
          user: {
            id: "usr_0a12b",
            username: "dev_architect",
            email: "dev@api.studio",
            role: "Developer",
            joinedAt: "2026-01-15T08:30:00Z"
          }
        }, null, 2)
      },
      {
        method: "GET",
        path: "/auth/profile",
        status: 200,
        headers: [
          { key: "Content-Type", value: "application/json", enabled: true },
          { key: "X-Studio-Shield", value: "Verified-By-OpenPost", enabled: true }
        ],
        responseBody: JSON.stringify({
          id: "usr_0a12b",
          username: "dev_architect",
          email: "dev@api.studio",
          preferences: { theme: "dracula", font: "JetBrains Mono" },
          security: { multifactor: "enabled", lastLogin: new Date().toISOString() }
        }, null, 2)
      },
      {
        method: "POST",
        path: "/auth/register",
        status: 201,
        headers: [{ key: "Content-Type", value: "application/json", enabled: true }],
        responseBody: JSON.stringify({
          success: true,
          message: "User registered successfully inside Sandbox sandbox environment.",
          id: "usr_882cc",
          username: "new_developer"
        }, null, 2)
      }
    ]
  },
  {
    id: "template-stripe-payments",
    name: "Stripe & Checkout simulation",
    category: "Financial Gateway",
    description: "Matches the Stripe Checkout Sessions and PaymentIntent APIs, simulating response objects, tokens, and webhooks.",
    iconName: "Lock",
    badgeColor: "bg-emerald-950/50 text-emerald-400 border-emerald-800",
    routes: [
      {
        method: "POST",
        path: "/v1/checkout/sessions",
        status: 200,
        headers: [{ key: "Content-Type", value: "application/json", enabled: true }],
        responseBody: JSON.stringify({
          id: "cs_test_b1aA24f8dC10bE99a",
          object: "checkout.session",
          amount_subtotal: 4999,
          amount_total: 4999,
          currency: "usd",
          customer: "cus_test_99ab",
          payment_intent: "pi_3M3z8f...",
          payment_status: "unpaid",
          status: "open",
          success_url: "https://your-app.com/success?session_id={CHECKOUT_SESSION_ID}",
          cancel_url: "https://your-app.com/cancel",
          url: "https://checkout.stripe.com/c/pay/cs_test_b1aA24f8dC10bE99a"
        }, null, 2)
      },
      {
        method: "GET",
        path: "/v1/payment_intents/pi_3M3z8f",
        status: 200,
        headers: [{ key: "Content-Type", value: "application/json", enabled: true }],
        responseBody: JSON.stringify({
          id: "pi_3M3z8f",
          object: "payment_intent",
          amount: 4999,
          amount_received: 4999,
          client_secret: "pi_3M3z8f_secret_A823cc",
          currency: "usd",
          status: "succeeded"
        }, null, 2)
      }
    ]
  },
  {
    id: "template-ecommerce",
    name: "E-Commerce Catalog & Checkout",
    category: "B2C Services",
    description: "Comprehensive listing of shop products, categories, cart aggregates, and checkout state machines.",
    iconName: "Globe",
    badgeColor: "bg-amber-950/50 text-amber-400 border-amber-800",
    routes: [
      {
        method: "GET",
        path: "/products",
        status: 200,
        headers: [{ key: "Content-Type", value: "application/json", enabled: true }],
        responseBody: JSON.stringify([
          { id: 101, name: "Mechanical Keyboard 75%", price: 129.99, rating: 4.8, category: "Office Gears", inventory: 45 },
          { id: 102, name: "Noise Cancelling Headphones", price: 299.99, rating: 4.6, category: "Audio", inventory: 12 },
          { id: 103, name: "Ultra-Wide Monitor 34''", price: 449.99, rating: 4.7, category: "Displays", inventory: 8 }
        ], null, 2)
      },
      {
        method: "GET",
        path: "/products/categories",
        status: 200,
        headers: [{ key: "Content-Type", value: "application/json", enabled: true }],
        responseBody: JSON.stringify(["Office Gears", "Audio", "Displays", "Cables", "Smart Home"], null, 2)
      },
      {
        method: "POST",
        path: "/cart/checkout",
        status: 200,
        headers: [{ key: "Content-Type", value: "application/json", enabled: true }],
        responseBody: JSON.stringify({
          success: true,
          orderId: "ord_ec_772bb",
          total: 429.98,
          status: "processing_payment",
          estimatedDelivery: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().split("T")[0]
        }, null, 2)
      }
    ]
  },
  {
    id: "template-serverless-health",
    name: "Microservices Status & Metrics",
    category: "DevSecOps",
    description: "Matches cluster monitoring metrics, server health probes, container state, and latency arrays.",
    iconName: "Activity",
    badgeColor: "bg-cyan-950/50 text-cyan-400 border-cyan-800",
    routes: [
      {
        method: "GET",
        path: "/healthz",
        status: 200,
        headers: [{ key: "Content-Type", value: "application/json", enabled: true }],
        responseBody: JSON.stringify({
          status: "UP",
          uptimeSeconds: 84629,
          checks: {
            database: "healthy",
            redisCache: "healthy",
            openPostVaultGCM: "operational"
          },
          timestamp: new Date().toISOString()
        }, null, 2)
      },
      {
        method: "GET",
        path: "/metrics",
        status: 200,
        headers: [{ key: "Content-Type", value: "application/json", enabled: true }],
        responseBody: JSON.stringify({
          cpuUsagePercentage: 42.1,
          memoryUsageMegabytes: 844.5,
          activeRequestsCount: 18,
          p95ResponseTimeMs: 14.8,
          p99ResponseTimeMs: 44.1
        }, null, 2)
      }
    ]
  }
];
