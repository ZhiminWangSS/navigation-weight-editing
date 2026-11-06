# Research task: weight-space editing for NaVILA navigation

## Objective

Can you improve a pretrained NaVILA navigation policy by understanding and directly editing its internal weights?

Start from the original checkpoint and its native interface. Use training data to discover a measurable limitation, explain the relevant mechanism, and test an intervention. No behavioral diagnosis, target component, or edit direction is supplied in advance.

Evaluate navigation performance with **success rate (SR), success weighted by path length (SPL), and normalized dynamic time warping (nDTW)**. Report all three, including regressions and unchanged results.

## Research process

1. Inspect the original architecture and execution path: model inputs, inference, action interpretation, and simulator execution.
2. Examine representative training-split behavior. Form a small number of explicit hypotheses from measured evidence. State predictions and observations that would falsify each hypothesis before testing it.
3. Inspect relevant weights and activations. Test causal interventions, declared intervention strengths, ablations, and appropriate controls. Distinguish associations from demonstrated effects.
4. Construct a justified internal-weight edit. Verify that its effect survives serialization and ordinary checkpoint loading.
5. Select a candidate using training data only. Confirm it once on reserved training scenes, then freeze the candidate and its complete evaluation configuration.

A runtime defect is a separate finding; repairing runtime code does not count as a weight-editing result. Record unsuccessful hypotheses and alternative explanations as well as successful interventions.

## Editing constraints

Allowed: inspecting weights and activations; forward inference; matrix and spectral analysis; reasoned sparse or low-rank internal tensor changes; declared dose-response probes; component removal; and norm-matched random controls.

Excluded: backpropagation, autograd gradients, optimizers, LoRA, supervised regression or least-squares fitting to examples, distillation, iterative loss fitting, and automatic black-box parameter optimization.

Keep input embeddings, the language output head, final normalization, tokenizer, architecture, and model configuration unchanged. Do not use whole-tensor scalar multiplication as the intervention. These restrictions define this experiment; they are not a universal definition of weight-space programming.

Keep the original observation sampler, prompt, decoding, action parser, primitive sizes, within-episode action queue, and episode limit. No diagnostic hooks, logit processors, added controllers, action-text rewrites, or episode-specific branches may remain in the evaluated policy. All variants start each episode with fresh episode state under the same frozen evaluation protocol.

## Training-only development

Use original R2R training data for all diagnosis, intervention design, tuning, selection, and confirmation. Before measurements, freeze scene-disjoint discovery, selection, and confirmation subsets, deduplicating physical trajectories. These subsets are held out from this editing process, not necessarily from base-model pretraining.

Before candidate comparisons, declare the selection rule and preservation conditions for SR, SPL, and nDTW. Compare original and edited checkpoints on identical training episodes and seeds. Prefer a candidate that improves at least one of these metrics without observed degradation in the others; report uncertainty and any trade-off. Do not silently redefine the objective after inspecting candidate outcomes.

Use the confirmation subset once after selection, without another tuning cycle. If no candidate is supported, report a negative result. A mechanistically justified rejected or unvalidated candidate may be frozen for a diagnostic final comparison, with its status explicitly recorded before testing. Do not create an arbitrary patch to satisfy a deliverable.

## Held-out test separation

The independent evaluator will use the exact existing **SenseNova R2R val_unseen rand100** dataset and its paired ground-truth archive, frozen by file checksums. It must not rebuild a subset from episode IDs in another dataset copy. The research agent receives no test IDs, scene list, instructions, observations, reference paths, labels, or results.

Do not access val_unseen data, evaluator-only artifacts, previous experiments, edited checkpoints, prior hypotheses, feature caches, result analyses, or public experiment pages. Do not use test information to choose training examples, mechanisms, strengths, candidates, or stopping rules for research.

The research agent must start in a fresh context containing only this prompt and a training-only environment handoff. The coordinator and evaluator must not pass prior findings or test feedback into that context.

After selection and confirmation, freeze the patch hash, native checkpoint hashes, construction procedure, candidate status, and all evaluation settings. Only then may the independent evaluator run the original and frozen edited checkpoints on rand100. No partial test feedback goes to the research agent. Final test results cannot change this run's candidate or configuration; they belong in the report, not a new tuning loop.

## Measurements

- **SR, SPL, and nDTW:** use the frozen evaluator's native implementations and the same reference data for both checkpoints. Report aggregate values and per-episode paired results, with units and denominators. Do not replace nDTW or SPL with proxy scores.
- **Supporting observations:** terminal navigation error, path length, primitive steps, model calls, invalid actions, and timings, where available. These describe behavior; they do not replace the three declared navigation metrics.
- **Edit integrity:** tensor names and shapes, exact construction, actual changed entries after native serialization and FP16 loading, norms computed with adequate precision, unchanged tensors, and inference overhead.
- **Research cost:** language-model token usage during the editing process, separately from coordinator/evaluator overhead, NaVILA development inference, and final-test inference.

Use the same episodes, environment seeds, native model input pipeline, and simulator settings for original and edited policies. Record hardware and concurrent load; distinguish model inference time from total rollout time.

## Token accounting

Start a run-specific usage ledger before the fresh research agent's first request. Include all of its reasoning, tool-use turns, retries, failed hypotheses, and delegated editing work through the final candidate freeze. Record exact provider-reported usage per response where available: agent/thread identity, model/provider, timestamps, input tokens, cached input tokens, output tokens, reasoning tokens, and total tokens.

Deduplicate response receipts. Cached-input and reasoning counts are usually subsets of input and output respectively; do not add them again to totals. Preserve raw usage definitions and distinguish exact counts from estimates or unavailable fields. Never infer token usage from account quota percentages or transcript length.

Keep separate totals for editing agents, coordination/audit work, and preparation before research starts. Log NaVILA development inference token counts with a stated counting convention and do not combine them with the research-agent billable tokens. Keep final-test inference in its own ledger, excluded from editing totals. Record measurement coverage and any pending or missing usage receipts.

## Budget and artifacts

Use at most 50 diagnostic batches of at most 32 navigation contexts each, four candidate families, 96 total training-split closed-loop episodes including baselines and controls, and 4,096 development action-generation calls. Count retries and failed attempts. Stop development at the first applicable limit or six hours. Locked final evaluation is separate. Token usage is measured; no additional language-model token budget is imposed by this prompt.

Plan development allocations before measurements. Record any budget-driven amendment before affected candidate comparisons; do not choose a subset based on favorable outcomes. Preserve all work and count any work already started.

Use allocated idle GPUs only. Write to a new experiment directory. Preserve original code, weights, and earlier artifacts. Hash original model/configuration files, export a separately loadable edited checkpoint, independently verify untouched tensors and configuration, and verify the original again after evaluation. No physical-robot execution is included.

## Deliverables

Provide the diagnosis, predeclared hypotheses, causal and control results, construction script and patch if justified, verified native checkpoint, training-only selection and confirmation records, frozen candidate manifest, token-usage ledger with coverage, and a report of all three navigation metrics, regressions, costs, and limitations. A clear negative result is a valid outcome.

## Methodological references

- Robotics Weight Editing: https://cuzyoung.github.io/robotics-weight-editing/
- Original research prompt: https://cuzyoung.github.io/robotics-weight-editing/assets/source/original-research-prompt.txt
- Sparks of Weight-Space Programming: https://rikiyat.github.io/blog/weight-space-programming/
- Language-model experiment protocol: https://raw.githubusercontent.com/RikiyaT/lm_understand-logs/main/exp8_math/runs/p50c/turns/t001/prompt.txt

These sources motivate the investigation workflow. This is a new navigation experiment, not a reproduction of their reported results.
