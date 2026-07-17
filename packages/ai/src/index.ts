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
