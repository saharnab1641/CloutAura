import { NextFunction, Request, Response } from "express";
import { default as axios } from "axios";
import { bind } from "decko";
import { RedisClient } from "redis";
import { cacheClient, cacheGetAsync } from "../../../db/cache";

export class UserController {
  private cacheClient: RedisClient;

  constructor() {
    this.cacheClient = cacheClient;
  }

  @bind
  public async followerDifference(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> {
    try {
      const body = {
        username: req.body.username,
        notFollowingUserBack: req.body.notFollowingUserBack,
        page: req.body.page,
        perPage: req.body.perPage,
      };

      body.perPage = 10;
      if (!body.page) body.page = 1;

      if (!body.username) {
        return res.json({ error: "Input valid username" });
      }

      if (this.cacheClient) {
        const cacheResult = await cacheGetAsync(body.username);
        if (cacheResult) {
          const parsed = JSON.parse(cacheResult);
          const totalReqCount = body.notFollowingUserBack
            ? parsed.nfub.length
            : parsed.unfb.length;
          const startSliceIndex = (body.page - 1) * body.perPage;
          if (startSliceIndex >= totalReqCount)
            return res.json({ error: "Records don't exist" });
          const endSliceIndex = Math.min(
            body.page * body.perPage,
            totalReqCount
          );
          return res.json({
            count: totalReqCount,
            data: body.notFollowingUserBack
              ? parsed.nfub.slice(startSliceIndex, endSliceIndex)
              : parsed.unfb.slice(startSliceIndex, endSliceIndex),
            cache: true,
          });
        }
      }

      let payload = {
        Username: req.body.username || "",
        PublicKeyBase58Check: req.body.publickey || "",
        GetEntriesFollowingUsername: true,
        LastPublicKeyBase58Check: "",
        NumToFetch: 0,
      };

      const numFollowers = await axios.post(
        "https://bitclout.com/api/v0/get-follows-stateless",
        payload,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      const followers = await axios.post(
        "https://bitclout.com/api/v0/get-follows-stateless",
        { ...payload, NumToFetch: numFollowers.data.NumFollowers },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      payload.GetEntriesFollowingUsername = false;

      const numFollowing = await axios.post(
        "https://bitclout.com/api/v0/get-follows-stateless",
        payload,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      const following = await axios.post(
        "https://bitclout.com/api/v0/get-follows-stateless",
        { ...payload, NumToFetch: numFollowing.data.NumFollowers },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const nfub = Object.keys(following.data.PublicKeyToProfileEntry)
        .filter((key) => !(key in followers.data.PublicKeyToProfileEntry))
        .map((key) => {
          return {
            username: following.data.PublicKeyToProfileEntry[key].Username,
            publicKey:
              following.data.PublicKeyToProfileEntry[key].PublicKeyBase58Check,
            description:
              following.data.PublicKeyToProfileEntry[key].Description,
            isVerified: following.data.PublicKeyToProfileEntry[key].IsVerified,
            profilePicture: `https://bitclout.com/api/v0/get-single-profile-picture/${key}?fallback=https://bitclout.com/assets/img/default_profile_pic.png`,
          };
        }, {});

      const unfb = Object.keys(followers.data.PublicKeyToProfileEntry)
        .filter((key) => !(key in following.data.PublicKeyToProfileEntry))
        .map((key) => {
          return {
            username: followers.data.PublicKeyToProfileEntry[key].Username,
            publicKey:
              followers.data.PublicKeyToProfileEntry[key].PublicKeyBase58Check,
            description:
              followers.data.PublicKeyToProfileEntry[key].Description,
            isVerified: followers.data.PublicKeyToProfileEntry[key].IsVerified,
            profilePicture: `https://bitclout.com/api/v0/get-single-profile-picture/${key}?fallback=https://bitclout.com/assets/img/default_profile_pic.png`,
          };
        }, {});

      const redisObj = { nfub, unfb };

      if (this.cacheClient) {
        this.cacheClient.setex(
          body.username,
          10 * 60,
          JSON.stringify(redisObj)
        );
      }

      const totalReqCount = body.notFollowingUserBack
        ? nfub.length
        : unfb.length;
      const startSliceIndex = (body.page - 1) * body.perPage;
      if (startSliceIndex >= totalReqCount)
        return res.json({ error: "Records don't exist" });
      const endSliceIndex = Math.min(body.page * body.perPage, totalReqCount);

      return res.json({
        count: totalReqCount,
        data: body.notFollowingUserBack
          ? nfub.slice(startSliceIndex, endSliceIndex)
          : unfb.slice(startSliceIndex, endSliceIndex),
        cache: false,
      });
    } catch (err) {
      return res.json({ error: "Error fetching details" });
    }
  }

  public async createFollowTxn(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> {
    try {
      const body = {
        followerPublicKey: req.body.followerPublicKey,
        followedPublicKey: req.body.followedPublicKey,
        isUnfollow: req.body.isUnfollow,
      };

      if (!(body.followedPublicKey && body.followedPublicKey)) {
        return res.json({
          error: "Provide follower and followed user public keys",
        });
      }

      if (body.isUnfollow == null) body.isUnfollow = false;

      const postData = {
        FollowerPublicKeyBase58Check: body.followerPublicKey,
        FollowedPublicKeyBase58Check: body.followedPublicKey,
        IsUnfollow: body.isUnfollow,
        MinFeeRateNanosPerKB: 1000,
      };

      const response = await axios.post(
        "https://bitclout.com/api/v0/create-follow-txn-stateless",
        postData,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      return res.json({ txnHex: response.data.TransactionHex });
    } catch (err) {
      return res.json(err);
    }
  }

  public async submitTxn(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> {
    try {
      const body = {
        signedTxn: req.body.signedTxn,
      };

      if (!body.signedTxn) {
        return res.json({
          error: "Provide a transaction hex",
        });
      }

      const response = await axios.post(
        "https://bitclout.com/api/v0/submit-transaction",
        {
          TransactionHex: body.signedTxn,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      return res.json({ message: "Transaction Submitted successfully" });
    } catch (err) {
      return res.json({ error: "Error creating transaction" });
    }
  }

  public async getUser(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> {
    try {
      const body = {
        username: req.body.username,
      };

      if (!body.username) {
        return res.json({
          error: "Provide a valid username",
        });
      }

      const response = await axios.post(
        "https://bitclout.com/api/v0/get-single-profile",
        {
          PublicKeyBase58Check: "",
          Username: body.username,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const user = {
        username: body.username,
        profilePicture: `https://bitclout.com/api/v0/get-single-profile-picture/${response.data.Profile.PublicKeyBase58Check}?fallback=https://bitclout.com/assets/img/default_profile_pic.png`,
      };

      return res.json(user);
    } catch (err) {
      return res.json({ error: "User not found" });
    }
  }
}
