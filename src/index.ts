#!/usr/bin/env ts-node
import * as util from "./utils";

enum FAILURE_REASON {
  DENY_LIST = "Failed deny list validation",
  MAX_TOKEN_THRESHOLD = "Failed max token threshold",
}

type UserPolicyOptions = {
  maxTokens?: number; // 1 token is ~4 characters in english
  denyList?: string[]; // this should be a fuzzy match
  ignoreDefaultDenyList?: boolean;
  encodeOutput?: boolean; // uses byte pair encoding to turn text into a series of integers
};

interface PromptGuardPolicy {
  maxTokens: number; // 1 token is ~4 characters in english
  denyList: string[]; // this should be a fuzzy match
  ignoreDefaultDenyList: boolean;
  encodeOutput: boolean; // uses byte pair encoding to turn text into a series of integers
}

type PromptOutput = {
  pass: boolean; // false if processing fails validation rules (max tokens, deny list, allow list)
  output: string; // provide the processed prompt or failure reason
};

export class PromptGuard {
  PromptGuardPolicy: PromptGuardPolicy;

  constructor(userPolicyOptions: UserPolicyOptions = {}) {
    const defaultPromptGuardPolicy: PromptGuardPolicy = {
      maxTokens: 4096,
      denyList: [""],
      ignoreDefaultDenyList: false,
      encodeOutput: false,
    };

    // merge the user policy with the default policy to create the policy
    this.PromptGuardPolicy = {
      ...defaultPromptGuardPolicy,
      ...userPolicyOptions,
    };
  }

  async process(prompt: string): Promise<PromptOutput> {
    // processing order
    // normalize -> quote -> escape -> check tokens -> check allow list -> check deny list -> encode output

    // check the tokens count
    if (util.countTokens(prompt) > this.PromptGuardPolicy.maxTokens)
      return { pass: false, output: FAILURE_REASON.MAX_TOKEN_THRESHOLD };

    // check the deny list
    if (
      await util.checkDenyListItems(
        prompt,
        this.PromptGuardPolicy.denyList,
        this.PromptGuardPolicy.ignoreDefaultDenyList
      )
    )
      return { pass: false, output: FAILURE_REASON.DENY_LIST };

    return { pass: true, output: prompt };
  }
}
