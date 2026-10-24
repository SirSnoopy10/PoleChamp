-- IMP-153: własne arkusze sędziego (`GET /judge/me/score-sheets`) wyszukiwane po `judge_id`.
CREATE INDEX score_sheet_judge_idx ON score_sheet (judge_id, category_id);
