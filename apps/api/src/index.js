"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const fastify_2 = require("@trpc/server/adapters/fastify");
const _app_1 = require("./routers/_app");
const context_1 = require("./trpc/context");
const client_1 = require("./inngest/client");
const inngest_1 = require("./inngest");
const fastify_3 = require("inngest/fastify");
const server = (0, fastify_1.default)({ maxParamLength: 5000 });
server.register(cors_1.default, {
    origin: true,
    credentials: true,
});
server.register(fastify_2.fastifyTRPCPlugin, {
    prefix: '/trpc',
    trpcOptions: {
        router: _app_1.appRouter,
        createContext: context_1.createContext,
    },
});
server.route({
    method: ["GET", "POST", "PUT"],
    handler: (0, fastify_3.serve)({ client: client_1.inngest, functions: inngest_1.functions }),
    url: "/api/inngest",
});
// Render expects the server to listen on 0.0.0.0
const start = async () => {
    try {
        const port = Number(process.env.PORT) || 3001;
        await server.listen({ port, host: '0.0.0.0' });
        console.log(`🚀 API Server listening on port ${port}`);
    }
    catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};
start();
//# sourceMappingURL=index.js.map