import { Injectable } from '@nestjs/common'
import { TiebreakerConfig, RankedParticipant, selectTopN as selectTopNRule } from './tiebreaker-rules'
import { calculateRankingsWithTiebreaker } from './ranking-with-tiebreaker'

@Injectable()
export class TiebreakerService {
  apply(
    results: any[],
    config: TiebreakerConfig | null,
    categoryNames: Map<string, string>,
  ): RankedParticipant[] {
    const activeConfig: TiebreakerConfig = {
      firstCategoryId: config?.firstCategoryId ?? null,
      secondCategoryId: config?.secondCategoryId ?? null,
    }

    return calculateRankingsWithTiebreaker(results, activeConfig, categoryNames)
  }

  selectTopN(ranked: RankedParticipant[], n: number): RankedParticipant[] {
    return selectTopNRule(ranked, n)
  }
}
