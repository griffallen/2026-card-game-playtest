// @newgame/ai — learned-evaluation support for the New Game bot (issue #97, step 2).
//
// The shared, engine-agnostic feature layer both the offline trainer and the in-browser bot
// import: a pure, deterministic map from a GameState (a seat's perspective) to a fixed-length
// numeric vector describing the board by its STATS and keyword/aggregate profile — never by
// card identity (see features.ts header, Griff's ruling on #97).
export {
  featurize, featurizeNamed, describeFeatures,
  FEATURE_NAMES, FEATURE_VERSION, KEYWORDS,
} from './features.ts'

// Inference + eval policy — both pure and node-free, safe to bundle into the browser bot. The
// trainer (train.ts) and scoreboard (scoreboard.ts) are node-only CLIs and are deliberately NOT
// re-exported here, so importing @newgame/ai in the demo never drags in `node:*` or the corpus lib.
export { scoreState, sigmoid, type LinearModel } from './infer.ts'
export { evalMove, evalPolicy, type EnginePolicy } from './policy.ts'
