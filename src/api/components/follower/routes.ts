import { Router } from "express";
import { IComponentRoutes } from "../index";
import { UserController } from "./controller";

export class UserRoutes implements IComponentRoutes<UserController> {
  readonly controller: UserController = new UserController();
  readonly router: Router = Router();

  public constructor() {
    this.initRoutes();
  }

  initRoutes(): void {
    this.router.post("/followerdifference", this.controller.followerDifference);
    this.router.post("/createfollowtxn", this.controller.createFollowTxn);
    this.router.post("/submittxn", this.controller.submitTxn);
    this.router.post("/getuser", this.controller.getUser);
  }
}
