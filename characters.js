window.ROCKETMONSTERS = [
  ["CHR_001","괴룸파","우파루파","해","교란자",8,3,6,3,{
    documented:{role:true,stats:true,passive:true,skill:true},
    passive:{id:"charge_on_hit",name:"늪의 살갖",description:"자신이 공격받을 때마다 차지가 1 증가합니다."},
    skill:{id:"self_destruct",cost:6,name:"자폭",description:"적 전체에게 공격력 × 차지만큼 피해를 주고, 자신은 최대 체력의 100% 피해를 받습니다."}
  }],
  ["CHR_002","네벨라","누에나방","공","돌격자",5,6,2,7,{
    documented:{role:true,stats:true,passive:true,skill:true},
    passive:{id:"kill_growth",name:"배부름",description:"적을 처치하면 공격력 스탯이 3, 체력 스탯이 1 증가합니다. 체력 스탯 1은 최대·현재 HP 10으로 환산됩니다."},
    skill:{id:"weak_predation",cost:3,priority:1,name:"약자포식",description:"우선도 +1. 체력이 가장 낮은 적에게 공격력 × 2 피해를 주고, 실제 HP 피해의 30%를 회복합니다."}
  }],
  ["CHR_003","누디안","갯민숭달팽이","해","보호자",7,4,7,2,{
    documented:{role:true,stats:true,passive:true,skill:true},
    passive:{id:"status_immunity",name:"점액 피부",description:"해로운 상태에 걸리지 않습니다."},
    skill:{id:"sea_poison",cost:3,name:"바다의 독",description:"적 전체에게 공격력 ÷ 2 피해를 주고, 대상마다 30% 확률로 독을 부여합니다. 독은 턴 종료마다 현재 HP의 2% → 4% → 8%… 피해를 줍니다."}
  }],
  ["CHR_004","라피엘","토끼","공","보호자",6,2,4,8,{
    documented:{role:true,stats:true,passive:true,skill:true},
    passive:{id:"healing_to_shield",name:"빛의 수호",description:"자신에게 적용되는 회복을 같은 양의 보호막으로 전환합니다."},
    skill:{id:"blessing",cost:3,name:"축복",description:"현재 HP 비율이 가장 낮은 아군 1명을 최대 체력의 10%만큼 회복합니다."}
  }],
  ["CHR_005","로데레","쥐","육","암살자",3,8,3,6,{
    documented:{role:true,stats:true,passive:true,skill:true},
    passive:{id:"mark_prey",name:"교활한 쥐",description:"공격한 대상 1명에게 표식을 남깁니다. 표식 대상 공격 시 피해가 20% 증가합니다."},
    skill:{id:"cut_throat",cost:3,name:"목긋기",description:"표식이 있는 적에게 공격력 × 3 피해를 주고 공격 종료 후 표식을 지웁니다."}
  }],
  ["CHR_006","로페스","늑대","육","돌격자",5,5,5,5,{
    documented:{role:true,stats:true,passive:true,skill:true},
    passive:{id:"howling",name:"하울링",description:"아군이 적을 처치하면 다음 턴 동안 생존 아군 전체의 공격력이 2 증가합니다. 같은 턴에는 중첩되지 않습니다."},
    skill:{id:"hunt_start",cost:3,name:"사냥 시작",description:"생존한 적 전체의 방어력을 1 감소시킵니다."}
  }],
  ["CHR_007","롭","바닷가재","해","결전자",7,3,8,2,{
    documented:{role:true,stats:true,passive:true,skill:true},
    passive:{id:"shell_break",name:"갑각 깨기",description:"3턴마다 자신의 방어력이 1 감소하고 공격력이 2 증가합니다."},
    skill:{id:"smash",cost:3,name:"박살",description:"적 1명에게 공격력 × 2 피해를 줍니다."}
  }],
  ["CHR_008","루미","글라우쿠스 아틀란티쿠스","해","보호자",4,4,5,7,{
    documented:{role:true,stats:true,passive:true,skill:true},
    passive:{id:"calm_sea",name:"잔잔한 바다",description:"보호막을 보유한 생존 아군의 공격력과 속도가 2 증가합니다."},
    skill:{id:"sea_wave",cost:4,name:"바다의 물결",description:"생존한 해 타입 아군 전체에게 각자 최대 체력의 10% 보호막을 부여합니다."}
  }],
  ["CHR_009","마노","날도마뱀","공","보호자",6,4,8,2,{
    documented:{role:true,stats:true,passive:true,skill:true},
    passive:{id:"inhale",name:"들숨",description:"자신이 적에게 직접 HP 피해를 주면 행동 종료 시 투지가 1 추가 증가합니다."},
    skill:{id:"exhale",cost:4,name:"날숨",description:"자신을 제외한 생존 아군 전체의 투지를 1 증가시킵니다."}
  }],
  ["CHR_010","메카리스","귀상어 · 인간 · 매","공","결전자",3,2,9,6,{
    documented:{role:true,stats:true,passive:true,skill:true},
    passive:{id:"amplified_armor",name:"증폭 장갑",description:"공격에 적중당할 때마다 공격력이 2 증가합니다."},
    skill:{id:"full_barrage",cost:2,name:"전탄 발사",description:"적 전체에게 공격력 × 1.5 피해를 줍니다."}
  }],
  ["CHR_011","버그킹","장수풍뎅이 · 잠자리 · 개미","공","돌격자",6,5,3,6,{
    documented:{role:true,stats:true,passive:true,skill:true},
    passive:{id:"kings_leap",name:"왕의 도약",description:"턴 시작 시 속도가 1 증가합니다."},
    skill:{id:"kings_leap_attack",cost:2,priority:1,name:"왕의 도약",description:"우선도 +1. 적 1명에게 공격력 + 속도만큼 피해를 줍니다."}
  }],
  ["CHR_012","벨제버브","파리","공","결전자",8,2,5,5,{
    documented:{role:true,stats:true,passive:true,skill:true},
    passive:{id:"despise_weak",name:"약자멸시",description:"현재 HP가 가장 낮은 적을 우선 공격합니다."},
    skill:{id:"molt",cost:4,name:"탈피",description:"자신의 방어력과 속도가 1 감소하고 공격력이 3 증가합니다."}
  }],
  ["CHR_013","비대온","빈대","육","돌격자",7,5,2,6,{
    documented:{role:true,stats:true,passive:true,skill:true},
    passive:{id:"voracious_drain",name:"마구 흡혈",description:"직접 준 HP 피해의 20%만큼 회복합니다. 실제로 회복되면 배부름이 1 증가합니다."},
    skill:{id:"feast_time",cost:5,name:"만찬시간",description:"편성 순서가 높은 적부터 배부름 수만큼 선택해 각각 공격력 × 1.5 피해를 줍니다."}
  }],
  ["CHR_014","삼치","세발치","해","보호자",8,2,2,8,{
    documented:{role:true,stats:true,passive:true,skill:true},
    passive:{id:"seeping_current",name:"스며드는 물살",description:"스테이지 시작 시 편성 순서가 가장 낮은 적에게 물살을 부여합니다. 물살은 3턴마다 투지를 1 감소시킵니다."},
    skill:{id:"bind",cost:5,name:"속박",description:"물살을 보유한 적의 다음 행동을 1회 건너뛰게 합니다."}
  }],
  ["CHR_015","샤키아","상어","해","암살자",5,7,2,6,{
    documented:{role:true,stats:true,passive:true,skill:true},
    passive:{id:"blood_excitement",name:"피의 흥분",description:"자신과 같은 타입의 적에게 주는 피해가 1.2배가 됩니다."},
    skill:{id:"sharp_teeth",cost:3,name:"날카로운 이빨",description:"적 1명에게 공격력 × 2 피해를 주고 출혈을 부여합니다. 출혈은 턴 종료마다 최대 HP의 5% 피해를 줍니다."}
  }],
  ["CHR_016","센주아나","하이에나","육","보호자",6,4,3,7,{
    documented:{role:true,stats:true,passive:true,skill:true},
    passive:{id:"conviction",name:"신념",description:"직접 준 HP 피해의 20%만큼 현재 HP 비율이 가장 낮은 생존 아군 1명을 회복합니다."},
    skill:{id:"perseverance",cost:3,name:"인내",description:"적 전체에게 공격력만큼 피해를 주고 생존 아군 전체에게 보호막 10을 부여합니다."}
  }],
  ["CHR_017","셰일","사슴","육","보호자",8,3,5,2,{
    documented:{role:true,stats:true,passive:true,skill:true},
    passive:{id:"life_affinity",name:"생명친화",description:"턴 종료 시 보호막을 보유한 생존 아군이 현재 HP의 10%를 회복합니다."},
    skill:{id:"leaf_guard",cost:5,name:"잎새의 보호",description:"생존 아군 전체에게 각자 최대 체력의 20% 보호막을 부여합니다."}
  }],
  ["CHR_018","수리","흰머리수리","공","암살자",3,8,1,8,{
    documented:{role:true,stats:true,passive:true,skill:true},
    passive:{id:"swift_pressure",name:"맹급류",description:"자신보다 속도가 느린 적을 공격하면 피해가 30% 증가합니다."},
    skill:{id:"surprise_strike",cost:4,priority:3,name:"급습",description:"우선도 +3. 적의 잃은 HP 비율만큼 피해 배율이 증가합니다. 잃은 HP가 30%라면 공격력 × 1.3 피해를 줍니다."}
  }],
  ["CHR_019","스웜 레이쓰","날벌레 군체","공","돌격자",2,9,4,5,{
    documented:{role:true,stats:true,passive:true,skill:true},
    passive:{id:"swarm_body",name:"흩어지는 신체",description:"전투 시작 시 군체 3을 얻습니다. 군체 1당 회피율이 10% 증가하고, 공격에 적중당하면 군체가 1 감소합니다. 군체는 최대 3입니다."},
    skill:{id:"wraith_advance",cost:3,name:"망령의 전진",description:"편성 순서가 빠른 적부터 군체 수만큼 선택해 각각 군체 × 공격력 피해를 주고 군체를 1 얻습니다."}
  }],
  ["CHR_020","스위피","칼새","공","암살자",2,7,2,9,{
    documented:{role:true,stats:true,passive:true,skill:true},
    passive:{id:"first_damage_null",name:"풍신소녀",description:"전투에서 자신이 받는 첫 피해를 0으로 만듭니다. 직접 공격과 상태 피해 모두 포함합니다."},
    skill:{id:"express_delivery",cost:2,name:"특급배송",description:"적 1명에게 방어력을 무시하는 공격을 2회 진행합니다. 자신의 속도가 대상보다 높으면 3회 진행합니다."}
  }],
  ["CHR_021","스콜라","전갈","육","암살자",5,7,4,4,{
    documented:{role:true,stats:true,passive:true,skill:true},
    passive:{id:"poison_spray",name:"독 뿌리기",description:"독에 걸린 대상에게 주는 피해가 1.5배가 됩니다."},
    skill:{id:"pierce",cost:3,name:"꿰뚫기",description:"적 1명에게 기절과 독을 부여합니다. 대상과 자신은 각 팀의 1번 캐릭터와 자리를 교환합니다."}
  }],
  ["CHR_022","시엘라","은상어 · 클리오네","해","교란자",4,7,3,6,{
    documented:{role:true,stats:true,passive:true,skill:true},
    passive:{id:"sacrificial_self_harm",name:"산제물",description:"공격할 때마다 자해를 1 얻습니다. 자해는 턴 종료 시 중첩당 출혈의 절반인 최대 HP의 2.5% 피해를 줍니다."},
    skill:{id:"descent",cost:5,name:"강림",description:"스킬 사용 직전 자해 수만큼, 적 전체에게 각각 기본 공격 피해를 반복합니다."}
  }],
  ["CHR_023","아우렐라 & 펠리아","해파리","해","보호자",7,2,7,4,{
    documented:{role:true,stats:true,passive:true,skill:true},
    passive:{id:"current_wrap",name:"해류감기",description:"자신을 공격한 캐릭터에게 적중 여부와 관계없이 50% 확률로 마비를 부여합니다. 마비는 전투 종료까지 속도를 절반으로 만듭니다."},
    skill:{id:"paralysis_release",cost:4,name:"마비방출",description:"생존한 적 전체와 자신에게 마비를 부여합니다."}
  }],
  ["CHR_024","아젤리아","백조","공","교란자",1,1,1,1,{
    documented:{role:true,stats:true,passive:true,skill:true},
    passive:{id:"limited_time",name:"한정된 시간",description:"전투 시작 시 모든 스탯이 8 증가합니다. 턴 종료 시 모든 스탯이 2 감소합니다."},
    skill:{id:"black_feather",cost:2,name:"검은 깃",description:"적 1명에게 기본 공격을 진행한 뒤 모든 스탯이 2 증가합니다."}
  }],
  ["CHR_025","알코","범고래","해","돌격자",7,8,2,3,{
    documented:{role:true,stats:true,passive:true,skill:true},
    passive:{id:"deadeye",name:"대해적",description:"전투 시작 시 필중을 얻어 모든 공격이 반드시 적중합니다."},
    skill:{id:"orca_strike",cost:3,name:"범고래 스트라이크",description:"적 1명에게 공격력 × 3 피해를 줍니다. 피해를 준 뒤 대상의 HP가 15 이하라면 처형합니다."}
  }],
  ["CHR_026","암카라시","향유고래 · 범고래 · 백상아리","해","돌격자",8,3,7,2,{
    documented:{role:true,stats:true,passive:true,skill:true},
    passive:{id:"primal_predation",name:"원시의 포식",description:"전장의 캐릭터가 전투불능이 될 때마다 공격력과 속도가 1 증가합니다."},
    skill:{id:"predation",cost:3,name:"포식",description:"적 1명에게 공격력 × 2.5 피해를 줍니다. 공격 전 대상의 HP가 50% 미만이면 피해가 30% 증가합니다."}
  }],
  ["CHR_027","연나연","깡충거미","육","교란자",6,7,3,4,{
    documented:{role:true,stats:true,passive:true,skill:true},
    passive:{id:"web",name:"거미줄",description:"마비된 적이 하나라도 존재하면 속도가 2배가 됩니다."},
    skill:{id:"web_bind",cost:3,name:"거미줄 속박",description:"적 1명에게 기본 공격을 합니다. 대상이 자신보다 느리면 속박을 1 부여하고, 빠르면 마비를 부여합니다. 속도가 같으면 상태를 부여하지 않습니다. 속박 2에서 기절, 3에서 처형됩니다."}
  }],
  ["CHR_028","연화","비단잉어","해","보호자",4,5,5,6,{
    documented:{role:true,stats:true,passive:true,skill:true},
    passive:{id:"embracing_wave",name:"보듬는 물결",description:"전투 시작 시 편성 1번 아군에게 비단을 부여합니다. 비단은 턴 시작마다 최대 HP의 5%를 회복합니다."},
    skill:{id:"kind_greeting",cost:3,name:"다정한 인사",description:"생존 아군 전체의 공격력을 3 증가시킵니다."}
  }],
  ["CHR_029","오카미","늑대","육","결전자",4,4,4,8,{
    documented:{role:true,stats:true,passive:true,skill:true},
    passive:{id:"full_moon",name:"만월",description:"전투 시작 시 그믐을 얻습니다. 그믐은 턴 시작마다 체력 스탯 +1, 2회 후 반월로 교체됩니다. 반월은 턴 시작마다 방어력 +1, 2회 후 만월로 교체되며 만월 진입 시 공격력 +3을 얻습니다."},
    skill:{id:"moonlight_moment",cost:3,name:"한 순간의 달빛",description:"적 1명에게 그믐/반월/만월 상태에 따라 공격력 × 2/2.5/3 피해를 줍니다."}
  }],
  ["CHR_030","울브","갈기늑대","육","암살자",6,6,3,5,{
    documented:{role:true,stats:true,passive:true,skill:true},
    passive:{id:"prey_found",name:"먹잇감 발견",description:"기본 공격 시 자신이 부여한 피냄새를 가진 적 전원을 공격합니다. 피냄새는 턴 종료 시 출혈과 같은 최대 HP의 5% 피해를 주고 울브의 다음 행동 종료 후 사라집니다."},
    skill:{id:"bite",cost:3,name:"물어뜯기",description:"편성 후방의 적부터 최대 2명에게 기본 공격을 하고 피냄새를 부여합니다."}
  }],
  ["CHR_031","울피","늑대","육","암살자",3,7,3,7,{
    documented:{role:true,stats:true,passive:true,skill:true},
    passive:{id:"wild_spirit",name:"불굴의 투지",description:"턴 시작 시 야성을 1 얻습니다. 야성 1당 속도 +1, 회피율 +5%를 얻으며 회피율 증가는 최대 50%입니다."},
    skill:{id:"flurry",cost:3,name:"몰아치기",description:"야성 수만큼 무작위 생존 적에게 기본 공격을 반복합니다."}
  }],
  ["CHR_032","카라","까마귀","공","결전자",4,7,2,7,{
    documented:{role:true,stats:true,passive:true,skill:true},
    passive:{id:"vengeful_blade",name:"복수의 칼날",description:"턴 시작 및 공격받은 뒤 암기를 1 얻습니다. 암기 1당 회피율이 5% 증가합니다."},
    skill:{id:"memory_barrage",cost:3,name:"암기 난사",description:"적 1명을 암기 수만큼 연속 공격한 뒤 암기를 모두 제거합니다."}
  }],
  ["CHR_033","카르노가디안","알비노 도마뱀","육","결전자",8,3,8,1,{
    documented:{role:true,stats:true,passive:true,skill:true},
    passive:{id:"red_gem",name:"붉은 보석",description:"턴 종료 시 공격력과 방어력을 서로 바꿉니다. 방어력이 높으면 보석, 공격력이 높으면 공세 상태입니다."},
    skill:{id:"all_out_offense",cost:2,name:"총공세",description:"적 1명에게 기본 공격을 합니다. 보석 상태에서는 방어력이 1, 공세 상태에서는 공격력이 1 증가합니다."}
  }],
  ["CHR_034","카이론","사자","육","돌격자",7,7,3,3,{
    documented:{role:true,stats:true,passive:true,skill:true},
    passive:{id:"tough_hide",name:"질긴 가죽",description:"받는 기본 공격 피해는 0.7배, 스킬 피해는 1.3배가 됩니다."},
    skill:{id:"beast_slash",cost:0,noGritGain:true,name:"맹수 참격",description:"적 1명에게 공격력 × 1.3 피해를 줍니다. 이 행동으로 투지가 쌓이지 않습니다."}
  }],
  ["CHR_035","코스모 도리스","갯민숭달팽이","해","결전자",4,5,4,7,{
    documented:{role:true,stats:true,passive:true,skill:true},
    passive:{id:"bullying",name:"쟤가 나 괴롭혀",description:"전투 시작 시 무작위 적에게 괴롭힘을 부여합니다. 코스모 도리스를 공격한 캐릭터에게 괴롭힘이 옮겨가며, 괴롭힘 대상은 받는 피해가 1.3배가 됩니다."},
    skill:{id:"tell_mom",cost:4,name:"엄마한테 이를거야",description:"괴롭힘을 가진 적을 편성 순서 1번으로 이동시킵니다."}
  }],
  ["CHR_036","키르유","파리지옥","육","교란자",9,2,6,3,{
    documented:{role:true,stats:true,passive:true,skill:true},
    passive:{id:"love_devour",name:"나도 널 사랑해",description:"전투 시작 시 같은 편성 순서의 적과 함께 각 팀의 1번 자리로 이동하고 대상에게 삼킴 1을 부여합니다. 삼킴 대상은 행동할 수 없고 4중첩에서 즉사합니다. 키르유는 배불러를 얻어 받는 피해가 1.5배가 됩니다."},
    skill:{id:"bon_appetit",cost:2,name:"그럼 잘 먹겠습니다",description:"자신이 삼킨 적의 삼킴을 1 증가시키고 최대 체력의 5%를 회복합니다."}
  }],
  ["CHR_037","파르바","꼬마비로드갯민숭달팽이","해","교란자",7,1,3,9,{
    documented:{role:true,stats:true,passive:true,skill:true},
    passive:{id:"mata_hari",name:"마타 하리",description:"공격이 적중하면 대상에게 극독을 1 부여합니다. 극독이 6 이상이면 즉사합니다."},
    skill:{id:"charlotte_corday",cost:3,name:"샤를로트 코르테",description:"편성 순서가 빠른 적 최대 2명에게 극독을 1 부여합니다."}
  }],
  ["CHR_038","피코","공작 · 물총새","공","암살자",1,9,1,9,{
    documented:{role:true,stats:true,passive:true,skill:true},
    passive:{id:"jewel_feather",name:"보석 깃털",description:"전투 시작 시 최대 체력의 30%만큼 보호막을 얻습니다."},
    skill:{id:"diving_attack",cost:3,name:"다이빙 어택",description:"적 1명에게 공격력 × 2 피해를 주고, 실제 HP 피해의 절반만큼 보호막을 얻습니다."}
  }],
  ["CHR_039","하따","하늘다람쥐","공","교란자",6,7,2,5,{
    documented:{role:true,stats:true,passive:true,skill:true},
    passive:{id:"fall_ready",name:"낙하준비",description:"턴 시작 시 낙하를 1 얻고 체력·공격력·방어력·속도 중 하나가 무작위로 1 증가합니다."},
    skill:{id:"squirrel_thunder",cost:6,name:"람쥐썬더",description:"낙하 수만큼 적 1명에게 기본 공격을 반복하고, 모든 스탯이 낙하 × 2만큼 감소합니다."}
  }],
  ["CHR_040","호루스","매","육","결전자",8,2,7,3,{
    documented:{role:true,stats:true,passive:true,skill:true},
    passive:{id:"aloof_knowledge",name:"고고함",description:"턴 시작, 다른 아군의 피격, 다른 아군의 전투불능마다 지식을 1 얻습니다. 지식이 29 이하이면 행동하지 않습니다."},
    skill:{id:"last_command",cost:8,name:"최후의 호령",description:"자신과 생존한 적 전체를 대상으로 지식 ÷ 2회 기본 공격을 반복합니다."}
  }],
  ["CHR_041","호퍼","펭귄","해","암살자",5,6,3,6,{
    documented:{role:true,stats:true,passive:true,skill:true},
    passive:{id:"steel_wing",name:"강철날개",description:"전투불능이 되는 피해를 전투당 1회 HP 1로 견딥니다. 기본 공격을 2회 진행합니다."},
    skill:{id:"blue_blade",cost:4,priority:2,name:"푸른칼날",description:"우선도 +2. 적 1명을 2회 공격하고, 적중할 때마다 대상의 방어력을 1 감소시킵니다."}
  }],
  ["CHR_042","루나","나비","공","보호자",5,2,7,6,{
    documented:{role:true,stats:true,passive:true,skill:true},
    passive:{id:"healing_power",name:"치유의 힘",description:"턴 시작 시 현재 HP 비율이 가장 낮은 생존 아군을 최대 체력의 10%만큼 회복합니다."},
    skill:{id:"silent_wing",cost:4,name:"침묵의 날개",description:"생존한 적 전체에게 침묵을 부여해 다음 행동에서 스킬을 사용할 수 없게 합니다."}
  }]
].map(([id,name,species,type,sourceRole,hp,atk,def,spd,meta = {}]) => ({
  id,
  name,
  species,
  type,
  sourceRole,
  hp,
  atk,
  def,
  spd,
  passive: meta.passive || null,
  skill: meta.skill || null,
  documented: meta.documented || {},
  image: `${id}_PT.png`
}));
