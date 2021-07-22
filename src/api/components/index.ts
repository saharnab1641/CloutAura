import { Router } from "express";
import { UserRoutes } from "./follower/routes";

export interface IComponentRoutes<T> {
  readonly controller: T;
  readonly router: Router;

  initRoutes(): void;
  initChildRoutes?(): void;
}

export function registerApiRoutes(router: Router, prefix: string = ""): void {
  router.use(`${prefix}/user`, new UserRoutes().router);
}
