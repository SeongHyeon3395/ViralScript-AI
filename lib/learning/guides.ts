import type { GuideSlug, LearningLanguage } from './catalog';

export interface GuideSection { heading: string; paragraphs?: string[]; steps?: string[]; sample?: string; conclusion?: string }
export interface GuideBody { introduction: string; illustrative?: boolean; sections: GuideSection[] }

export const GUIDE_BODIES: Record<GuideSlug, Record<LearningLanguage, GuideBody>> = {
  'write-a-brief': {
    en: {
      introduction: 'A useful video plan makes decisions you can carry into production: what the viewer should notice, what the camera will show, what the voiceover will say, and what can realistically be made. A vague topic leaves those decisions to the model. A specific brief makes the output easier to evaluate and revise.',
      sections: [
        { heading: 'Start with one viewer and one action', paragraphs: ['“Promote my café” does not explain who should care or what they should do. A more useful request is “Show commuters near the station that an iced drink is available to take away; invite them to see the menu.” This gives the script a situation and one ending.', 'Write the intended audience as a situation rather than a broad age range. Someone rushing to work needs a different demonstration from someone choosing a quiet place to sit. Avoid combining visits, follows, purchases, and comments into one short ending.'] },
        { heading: 'Give the model something it can show', paragraphs: ['Separate a promise from evidence. “A refreshing drink” is a description; a close-up of ice, a pour, and a hand picking up the cup are filmable actions. If you claim a price, ingredient, speed, or result, supply the real information and check it before publishing. Do not ask the model to invent proof.'], steps: ['Audience: who is watching, and in what situation?', 'Message: one thing they should remember.', 'Proof: the shot or real detail that supports the message.', 'Constraints: available footage, people, props, time, and location.', 'Ending: one clear next step.'] },
        { heading: 'Use a concrete brief', sample: 'Topic: a takeaway iced latte at a neighborhood café\nViewer: people leaving a nearby station on the way to work\nMessage: show the drink being prepared and ready to pick up\nEvidence: film the cup, ice, pour, and counter handoff\nLength: 20 seconds, vertical 9:16\nProduction: real filming, no face on camera\nAvailable assets: smartphone, window light, one drink, one staff member’s hands\nTone: calm and direct, no unsupported health or price claims\nEnding: invite the viewer to check the café menu', paragraphs: ['This is a fictional brief for planning practice. Replace the details with your own facts. If you have only still photographs, choose image-based production instead of requesting actions your footage cannot show.'] },
        { heading: 'Choose the production method before reviewing prompts', paragraphs: ['Real filming needs a shot list and staging instructions. AI video generation needs descriptions of subject, action, camera, light, and continuity. Existing-video editing needs instructions tied to footage you actually possess. Choose the methods you will use; select only the AI tools whose prompts you need.', 'ViralScript AI provides a plan and text prompts. It does not export a finished video or call a selected video tool on your behalf. Take the prompt to your chosen tool, inspect its result, and assemble narration and captions in your editor.'] },
        { heading: 'Review the plan against your brief', steps: ['Can each scene be filmed with the listed assets? Replace any unavailable person, location, or prop.', 'Read the narration aloud while timing the scene. Shorten it if the action finishes before the sentence.', 'Check that captions support the visual instead of covering the object or repeating every word.', 'Verify product details and claims. Remove facts you cannot support.', 'Change one decision at a time when revising: audience, opening shot, or ending. Keep the rest stable so you can understand what changed.'], paragraphs: ['A well-written brief improves the usefulness of the plan; it does not guarantee views or sales. Judge the first output by whether it is clear, accurate, and practical to produce.'] },
      ],
    },
    ko: {
      introduction: '좋은 영상 기획안은 제작에 필요한 결정을 담습니다. 시청자가 무엇을 알아차려야 하는지, 카메라로 무엇을 보여줄지, 어떤 내레이션을 넣을지, 실제로 만들 수 있는지를 정해야 합니다. 주제가 막연하면 AI가 이 결정을 임의로 채웁니다. 요청을 구체적으로 쓰면 결과를 검토하고 수정하기 쉬워집니다.',
      sections: [
        { heading: '한 명의 시청자와 하나의 행동부터 정하기', paragraphs: ['“우리 카페를 홍보해 줘”에는 누가 관심을 가져야 하는지, 무엇을 해야 하는지가 없습니다. “역 근처 출근길 손님에게 테이크아웃 아이스 음료의 준비 과정을 보여주고 메뉴 확인을 유도해 줘”라고 쓰면 상황과 마무리가 분명해집니다.', '넓은 나이 범위보다 시청자가 처한 상황을 적어 보세요. 출근을 서두르는 사람에게 필요한 장면과 조용히 앉을 곳을 찾는 사람에게 필요한 장면은 다릅니다. 짧은 마무리에 방문·팔로우·구매·댓글 요청을 모두 넣지 마세요.'] },
        { heading: '화면으로 보여줄 수 있는 근거 제공하기', paragraphs: ['약속과 근거를 구분하세요. “시원한 음료”는 설명이지만 얼음, 음료를 붓는 모습, 컵을 집어 드는 손은 촬영 가능한 행동입니다. 가격·재료·속도·효과를 말하려면 실제 정보를 제공하고 게시 전에 확인해야 합니다. AI에게 근거를 만들어 달라고 요청하지 마세요.'], steps: ['시청자: 누가 어떤 상황에서 보는가?', '메시지: 하나만 기억한다면 무엇인가?', '근거: 메시지를 뒷받침하는 장면이나 실제 정보는 무엇인가?', '제약: 사용할 영상, 사람, 소품, 시간, 장소는 무엇인가?', '마무리: 시청자에게 요청할 다음 행동은 무엇인가?'] },
        { heading: '구체적인 요청 예시', sample: '주제: 동네 카페의 테이크아웃 아이스 라테\n시청자: 인근 역에서 내려 출근하는 사람\n메시지: 음료가 준비되고 픽업되는 과정을 보여주기\n근거: 컵, 얼음, 음료 붓기, 카운터 전달 장면 촬영\n길이: 20초, 세로 9:16\n제작: 실사 촬영, 얼굴 노출 없음\n준비물: 스마트폰, 창가 빛, 음료 한 잔, 직원의 손\n톤: 차분하고 직접적, 확인되지 않은 건강·가격 주장 없음\n마무리: 카페 메뉴 확인 유도', paragraphs: ['기획 연습을 위한 가상의 요청입니다. 자신의 상황과 실제 정보로 바꾸세요. 사진만 있다면 보유하지 않은 동작을 요구하기보다 사진·이미지 기반 제작을 선택하는 편이 실용적입니다.'] },
        { heading: '제작 방식을 선택한 뒤 프롬프트 검토하기', paragraphs: ['실사 촬영에는 장면 목록과 배치 설명이 필요합니다. AI 영상에는 대상, 행동, 카메라, 조명, 장면 연속성이 필요합니다. 기존 영상 편집에는 실제로 가지고 있는 촬영본에 맞는 지시가 필요합니다. 사용할 제작 방식을 선택하고 필요한 AI 도구만 골라 주세요.', 'ViralScript AI는 기획안과 텍스트 프롬프트를 제공합니다. 완성된 영상을 출력하거나 선택한 영상 도구를 대신 실행하지는 않습니다. 프롬프트를 해당 도구에서 사용한 뒤 결과를 검토하고 편집기에서 내레이션과 자막을 조합하세요.'] },
        { heading: '요청과 대조해 결과 검토하기', steps: ['준비물로 각 장면을 촬영할 수 있는지 확인하고 없는 사람·장소·소품을 바꿉니다.', '장면 시간을 재면서 내레이션을 소리 내어 읽습니다. 행동보다 문장이 길면 줄입니다.', '자막이 대상을 가리지 않고 시각 정보를 보완하는지 확인합니다.', '제품 정보와 주장을 검증하고 근거 없는 사실을 삭제합니다.', '수정할 때 시청자·첫 장면·마무리 중 한 요소씩 바꿉니다. 나머지는 유지하면 변화의 이유를 이해하기 쉽습니다.'], paragraphs: ['좋은 요청은 기획안의 활용도를 높이지만 조회수나 매출을 보장하지 않습니다. 첫 결과는 명확하고 정확하며 실제로 제작할 수 있는지로 평가하세요.'] },
      ],
    },
    ja: {
      introduction: '役立つ企画には、視聴者に何を伝えるか、カメラで何を見せるか、何を話すか、実際に制作できるかという判断が必要です。曖昧なテーマではAIがそれらを補います。依頼を具体的にすると、結果を評価して修正しやすくなります。',
      sections: [
        { heading: '一人の視聴者と一つの行動を決める', paragraphs: ['「カフェを宣伝して」だけでは、誰に何をしてほしいかが分かりません。「駅から職場へ向かう人に、テイクアウト用のアイスドリンクの準備を見せ、メニューの確認を促す」と書くと状況と結びが明確になります。', '年齢の幅より視聴者の状況を書きましょう。急いで出勤する人と静かな席を探す人では必要な映像が違います。来店、フォロー、購入、コメントを一つの短い結びに詰め込まないでください。'] },
        { heading: '映像で示せる根拠を渡す', paragraphs: ['約束と根拠を分けます。「爽やかな飲み物」は説明ですが、氷の接写、注ぐ動作、カップを持つ手は撮影できます。価格、材料、速さ、効果を主張する場合は実際の情報を渡し、公開前に確認してください。AIに根拠を作らせないでください。'], steps: ['視聴者：誰がどんな状況で見るか。', 'メッセージ：一つだけ覚えてほしいこと。', '根拠：メッセージを支える映像や事実。', '条件：素材、人、道具、時間、場所。', '結び：お願いする次の行動。'] },
        { heading: '具体的な依頼の例', sample: 'テーマ：近所のカフェのテイクアウト用アイスラテ\n視聴者：駅から職場へ向かう人\nメッセージ：準備と受け取りの流れを見せる\n根拠：カップ、氷、注ぐ動作、カウンターでの受け渡し\n長さ：20秒、縦9:16\n制作：実写、顔は映さない\n素材：スマートフォン、窓の光、飲み物一杯、スタッフの手\nトーン：落ち着いて直接的、未確認の健康・価格の主張なし\n結び：メニューの確認を促す', paragraphs: ['企画練習用の架空の依頼です。自分の事実に置き換えてください。写真しかない場合は、撮影素材にない動作を求めるより写真・画像ベースの制作を選びます。'] },
        { heading: '制作方法を選んでからプロンプトを確認する', paragraphs: ['実写にはカット一覧と配置指示が必要です。AI動画には対象、動作、カメラ、照明、連続性が必要です。既存映像の編集には、実際に持つ素材に合う指示が必要です。使う制作方法と必要なAIツールを選びましょう。', 'ViralScript AIは企画とテキストのプロンプトを提供します。完成動画を出力したり、選択した動画ツールを代わりに実行したりしません。各ツールで生成結果を確認し、編集ソフトでナレーションと字幕を組み合わせます。'] },
        { heading: '依頼と照らして見直す', steps: ['持っている素材で各カットを作れるか確認し、使えない人・場所・道具を置き換えます。', '時間を測りながらナレーションを読み、動作より長ければ短くします。', '字幕が被写体を隠さず、映像の情報を補っているか確認します。', '商品情報や主張を検証し、根拠のない事実を削除します。', '修正は視聴者、冒頭、結びの一つずつにします。他を維持すると変化を理解しやすくなります。'], paragraphs: ['良い依頼は企画を使いやすくしますが、再生数や売上を保証しません。明確で正確で、制作可能かを基準に評価してください。'] },
      ],
    },
    zh: {
      introduction: '实用的视频方案需要明确：观众应该注意什么、镜头展示什么、旁白说什么，以及这些内容是否真的能制作。主题越模糊，模型就越需要自行补充这些决定。需求越具体，结果越容易检查和修改。',
      sections: [
        { heading: '确定一个观众场景和一个行动', paragraphs: ['“宣传我的咖啡店”没有说明谁应该感兴趣、应该做什么。“向从车站走去上班的人展示外带冰饮的制作过程，并邀请他们查看菜单”则有明确的场景和结尾。', '与其只写年龄范围，不如写观众正在做什么。赶着上班的人和寻找安静座位的人需要不同的画面。不要在一个短结尾中同时要求到店、关注、购买和留言。'] },
        { heading: '提供可以拍出来的证据', paragraphs: ['区分承诺和证据。“清爽的饮料”是描述；冰块特写、倒入饮料、手拿起杯子是可拍摄的动作。涉及价格、原料、速度或效果时，请提供真实信息并在发布前核实。不要让模型编造证据。'], steps: ['观众：谁在什么场景中观看？', '信息：只记住一件事，应当是什么？', '证据：哪个镜头或真实细节支持这条信息？', '条件：有哪些素材、人员、道具、时间和地点？', '结尾：希望观众采取哪一个下一步？'] },
        { heading: '具体需求示例', sample: '主题：社区咖啡店的外带冰拿铁\n观众：从附近车站前往工作地点的人\n信息：展示制作完成及取杯的过程\n证据：拍摄杯子、冰块、倒饮料、柜台交接\n时长：20秒，竖屏9:16\n制作：实拍，不露脸\n素材：手机、窗边光线、一杯饮料、店员的手\n语气：平静直接，不使用未经核实的健康或价格宣传\n结尾：邀请观众查看菜单', paragraphs: ['这是用于练习的虚构需求。请换成自己的真实信息。如果只有照片，请选择照片或图片制作方式，不要要求现有素材无法呈现的动作。'] },
        { heading: '先选制作方式，再检查提示词', paragraphs: ['实拍需要镜头清单和布置说明；AI视频需要主体、动作、镜头、光线和连续性；剪辑已有素材需要与实际素材对应的指示。选择真正要用的制作方式，并仅选择需要的AI工具。', 'ViralScript AI提供策划方案和文字提示词，不会输出成片，也不会代您调用所选视频工具。在相应工具中使用提示词，检查结果，再在剪辑软件中组合旁白和字幕。'] },
        { heading: '逐项对照需求审核', steps: ['确认现有条件能否完成每个镜头，替换无法使用的人、地点或道具。', '计时朗读旁白，如果句子比动作长，就缩短句子。', '检查字幕是否补充画面信息，而不是遮住主体或逐字重复旁白。', '核实产品信息和宣传内容，删除无法支持的事实。', '每次只修改一个决定，例如观众、开场或结尾。保留其他条件，便于理解变化。'], paragraphs: ['具体的需求能提高方案的实用性，但不保证播放量或销量。请先判断方案是否清楚、准确且能够实际制作。'] },
      ],
    },
  },
  'cafe-storyboard': {
    en: {
      illustrative: true,
      introduction: 'This worked example turns the café brief into a 20-second video with no faces and one location. The goal is to show a drink being prepared and handed over. Each shot has one job, so the sequence can be shortened without losing the message.',
      sections: [
        { heading: 'The brief and production limits', paragraphs: ['Use a smartphone, a window-lit counter, a clear cup, ice, coffee, milk, and one person’s hands. Film vertically. The example makes no claim about taste, health, price, or service speed. A viewer should understand the preparation and know where to find the menu.', 'Keep the cup, counter position, and light direction consistent. Film a complete take of each action before moving the camera. Leave room for captions rather than placing every subject in the center.'] },
        { heading: 'Five shots with distinct jobs', steps: ['0–2 seconds — Open on the ice and empty cup. Add “A small pause before work.” This establishes the situation without making a claim about the café.', '2–6 seconds — Film coffee being poured over the ice. A tight crop makes the action readable; keep the camera still so the movement belongs to the drink.', '6–10 seconds — Show milk being added from the same side. Keep the cup orientation identical to the previous shot. The change in color is the visual development.', '10–16 seconds — Show the lid being fitted and the cup placed at the counter edge. Use a slightly wider frame so viewers understand the handoff rather than seeing another abstract close-up.', '16–20 seconds — A hand picks up the drink. Finish on a clean frame with “See today’s menu.” Add a real café name or location only after you verify it.'] },
        { heading: 'Voiceover and captions', sample: 'Voiceover: “A small pause before work. Ice, coffee, a little milk—and you’re ready to go. See today’s menu.”\nOpening caption: “Before work”\nPreparation caption: “Made for takeaway”\nEnding caption: “See today’s menu”', paragraphs: ['Read the voiceover aloud before recording. If it does not fit your footage, shorten the narration instead of speeding it up until it feels rushed. The sample deliberately leaves some actions to the pictures; the voiceover does not describe every movement.', 'Preview captions on a phone. Keep the cup and the pickup action clear, and check that app controls will not hide the final line. Watch once with sound muted to confirm that the sequence still makes sense.'] },
        { heading: 'If you choose AI video instead of filming', sample: 'Vertical 9:16 café close-up. One clear unbranded cup with ice on a neutral counter beside a window. A hand slowly pours coffee into the cup. Locked camera, soft natural side light, realistic liquid motion. Preserve the cup shape and counter position. No text, no logo, no face. End before the milk pour; generate that as a separate shot.', paragraphs: ['This is a generic prompt to paste into a video tool, not a generated clip. Request one action per shot. Combining the pour, lid, and handoff into one prompt makes it harder to inspect continuity or replace a failed action.', 'Treat any logo, finger, cup, or liquid error as a reason to regenerate or replace the shot. Add captions in your editor so you can control spelling and placement.'] },
        { heading: 'A useful revision and a publish check', paragraphs: ['For viewers already familiar with the café, replace the opening situation with a specific item they recognize, while keeping the preparation sequence. For first-time visitors, use the last frame for an accurate location rather than assuming they know the shop. Change only one version’s opening or ending when comparing responses.'], steps: ['Confirm that the drink shown is actually available.', 'Use footage, music, and brand assets you are permitted to publish.', 'Check continuity, subtitle spelling, and a muted phone preview.', 'Evaluate results after publishing; this example has no measured campaign results and makes no promise of virality.'] },
      ],
    },
    ko: {
      illustrative: true,
      introduction: '카페 요청을 얼굴 노출 없이 한 장소에서 촬영하는 20초 기획으로 바꿔 보겠습니다. 목표는 음료 준비와 전달 과정을 보여주는 것입니다. 각 장면에 한 가지 역할을 주면 일부를 줄여도 메시지가 유지됩니다.',
      sections: [
        { heading: '요청과 제작 조건', paragraphs: ['스마트폰, 창가의 카운터, 투명 컵, 얼음, 커피, 우유, 한 사람의 손을 사용해 세로로 촬영합니다. 맛·건강·가격·제공 속도에 대한 주장은 하지 않습니다. 시청자가 준비 과정을 이해하고 메뉴를 어디서 볼지 알게 하는 것이 목표입니다.', '컵, 카운터 위치, 빛의 방향을 유지하세요. 카메라를 이동하기 전에 각 행동을 처음부터 끝까지 촬영합니다. 모든 대상을 화면 중앙에 채우기보다 자막이 들어갈 공간을 남깁니다.'] },
        { heading: '역할이 다른 다섯 장면', steps: ['0–2초 — 얼음과 빈 컵으로 시작합니다. “출근 전 작은 여유”라는 자막으로 상황을 정합니다. 카페의 효과를 주장하지 않으면서 볼 이유를 제시합니다.', '2–6초 — 얼음 위로 커피를 붓는 모습을 촬영합니다. 가까운 구도로 행동을 읽기 쉽게 만들고 카메라를 고정해 음료의 움직임에 집중합니다.', '6–10초 — 같은 방향에서 우유를 넣습니다. 앞 장면과 컵의 방향을 동일하게 유지합니다. 색 변화가 이 장면의 시각적 전개입니다.', '10–16초 — 뚜껑을 닫고 컵을 카운터 가장자리에 놓습니다. 조금 넓은 구도로 바꿔 추상적인 접사보다 전달 상황을 이해하게 합니다.', '16–20초 — 손이 음료를 집어 듭니다. 정돈된 화면에 “오늘의 메뉴 확인하기”로 끝냅니다. 실제 카페명이나 위치는 확인한 뒤 넣습니다.'] },
        { heading: '내레이션과 자막', sample: '내레이션: “출근 전 작은 여유. 얼음, 커피, 우유를 더해 한 잔을 준비합니다. 오늘의 메뉴를 확인해 보세요.”\n첫 자막: “출근 전”\n준비 장면 자막: “테이크아웃 한 잔”\n마무리 자막: “오늘의 메뉴 확인하기”', paragraphs: ['녹음 전에 소리 내어 읽으세요. 촬영본 길이에 맞지 않으면 급하게 말하기보다 문장을 줄입니다. 이 예시는 일부 행동을 화면에 맡깁니다. 내레이션으로 모든 움직임을 설명하지 않습니다.', '휴대폰에서 자막을 확인하세요. 컵과 픽업 행동을 가리지 않도록 배치하고 앱 버튼이 마지막 문장을 가리지 않는지 살펴봅니다. 소리를 끄고 한 번 더 보며 흐름이 이해되는지도 확인합니다.'] },
        { heading: '실사 대신 AI 영상을 선택한다면', sample: '세로 9:16 카페 접사. 창가의 단순한 카운터에 얼음이 담긴 무상표 투명 컵 하나. 손이 컵에 커피를 천천히 붓는다. 카메라 고정, 부드러운 측면 자연광, 사실적인 액체 움직임. 컵 모양과 카운터 위치 유지. 텍스트·로고·얼굴 없음. 우유를 넣기 전에 종료하고 우유 장면은 별도로 생성한다.', paragraphs: ['영상 도구에 붙여 넣을 범용 프롬프트이며 생성된 영상이 아닙니다. 한 장면에서 한 행동만 요청하세요. 커피 붓기, 뚜껑 닫기, 전달을 한 프롬프트에 넣으면 연속성을 확인하거나 실패한 행동만 교체하기 어렵습니다.', '로고·손가락·컵·액체에 오류가 있다면 해당 장면을 다시 만들거나 바꿉니다. 자막은 편집기에서 추가하면 철자와 위치를 직접 제어할 수 있습니다.'] },
        { heading: '수정 방향과 게시 전 점검', paragraphs: ['카페를 이미 아는 시청자에게는 첫 상황 대신 익숙한 특정 메뉴를 보여주고 준비 과정은 유지할 수 있습니다. 처음 보는 시청자에게는 매장을 안다고 가정하지 말고 마지막 장면에 정확한 위치를 넣으세요. 반응을 비교할 때는 첫 장면이나 마무리 중 하나씩 바꿉니다.'], steps: ['보여주는 음료가 실제로 제공되는지 확인합니다.', '게시할 권한이 있는 영상·음악·브랜드 자료를 사용합니다.', '연속성, 자막 철자, 휴대폰 무음 미리보기를 점검합니다.', '성과는 게시 후 평가합니다. 이 예시에 실측 캠페인 결과는 없으며 바이럴을 보장하지 않습니다.'] },
      ],
    },
    ja: {
      illustrative: true,
      introduction: 'カフェの依頼を、顔を映さず一つの場所で撮る20秒の企画に変えます。目的は飲み物の準備と受け渡しを見せることです。各カットに一つの役割を与えると、短くしてもメッセージを維持できます。',
      sections: [
        { heading: '依頼と制作条件', paragraphs: ['スマートフォン、窓辺のカウンター、透明なカップ、氷、コーヒー、ミルク、一人の手を使って縦に撮影します。味、健康、価格、提供速度の主張はしません。準備の流れとメニューの確認先を伝えます。', 'カップ、カウンターの位置、光の方向をそろえます。カメラを動かす前に各動作を最初から最後まで撮影し、字幕用の余白を残してください。'] },
        { heading: '役割の異なる5カット', steps: ['0–2秒：氷と空のカップで開始。「出勤前のひと息」で状況を示します。', '2–6秒：氷にコーヒーを注ぐ接写。カメラを固定し、飲み物の動きに集中します。', '6–10秒：同じ側からミルクを加えます。カップの向きを維持し、色の変化を見せます。', '10–16秒：ふたを付け、カップをカウンターの端に置きます。少し広く撮って受け渡しの状況を伝えます。', '16–20秒：手がカップを取ります。「今日のメニューをチェック」で終えます。店名や場所は確認後に追加します。'] },
        { heading: 'ナレーションと字幕', sample: 'ナレーション：「出勤前のひと息。氷とコーヒー、ミルクを合わせて一杯を準備。今日のメニューをチェック。」\n冒頭字幕：「出勤前に」\n準備の字幕：「テイクアウトの一杯」\n最後の字幕：「今日のメニューをチェック」', paragraphs: ['録音前に声に出して読みます。尺に合わなければ早口にするより文を短くしてください。すべての動きを説明せず、一部は映像に任せます。', 'スマートフォンで字幕を確認し、カップや手の動作を隠さないようにします。アプリの操作部分が最後の行を隠さないか確認し、無音でも流れが伝わるか見直します。'] },
        { heading: '実写の代わりにAI動画を使う場合', sample: '縦9:16のカフェ接写。窓辺の無地のカウンターに、氷入りの無印透明カップが一つ。手がコーヒーをゆっくり注ぐ。固定カメラ、柔らかい自然の側光、自然な液体の動き。カップの形とカウンター位置を維持。文字、ロゴ、顔なし。ミルクを注ぐ前に終了し、そのカットは別に生成する。', paragraphs: ['動画ツールに貼り付ける汎用プロンプトで、生成済みの動画ではありません。一つのカットには一つの動作を指定します。注ぐ、ふたを付ける、渡すを一度に依頼すると、連続性の確認や失敗した動作の置き換えが難しくなります。', 'ロゴ、指、カップ、液体に誤りがあれば作り直すか置き換えます。字幕は編集ソフトで付け、文字と位置を管理します。'] },
        { heading: '修正と公開前の確認', paragraphs: ['店を知る人向けなら、冒頭を見覚えのあるメニューに変え、準備の流れを維持できます。初めて見る人向けなら最後に正確な場所を示します。反応を比較する際は冒頭か結びの一つずつを変えてください。'], steps: ['映した飲み物が実際に提供されているか確認します。', '公開する権限がある映像、音楽、ブランド素材を使います。', '連続性、字幕の文字、スマートフォンの無音表示を確認します。', '成果は公開後に評価します。この例に実測結果はなく、拡散を保証しません。'] },
      ],
    },
    zh: {
      illustrative: true,
      introduction: '这个完整示例把咖啡店需求转化成一个不露脸、只在一个地点拍摄的20秒视频。目标是展示饮料准备和交接过程。每个镜头只承担一个任务，因此缩短视频时也不容易丢失主旨。',
      sections: [
        { heading: '需求和制作条件', paragraphs: ['使用手机、窗边柜台、透明杯、冰块、咖啡、牛奶及一个人的手，竖屏拍摄。不宣传口味、健康、价格或服务速度。观众应当理解制作过程，并知道去哪里查看菜单。', '保持杯子、柜台位置及光线方向一致。移动镜头前，完整拍下每一个动作，并给字幕留出空白区域。'] },
        { heading: '五个不同任务的镜头', steps: ['0–2秒：用冰块和空杯开场。字幕“上班前的一点从容”建立场景。', '2–6秒：特写咖啡倒入冰块。固定相机，让饮料的动作成为画面重点。', '6–10秒：从同一侧加入牛奶，保持杯子方向一致，展示颜色变化。', '10–16秒：盖好杯盖，把饮料放在柜台边缘。稍微拉宽画面，让观众理解交接场景。', '16–20秒：一只手拿走饮料，用整洁画面和“查看今日菜单”结束。核实后再添加真实店名或位置。'] },
        { heading: '旁白和字幕', sample: '旁白：“上班前的一点从容。冰块、咖啡，再添一点牛奶，一杯就准备好了。查看今日菜单。”\n开场字幕：“上班前”\n制作字幕：“外带一杯”\n结尾字幕：“查看今日菜单”', paragraphs: ['录音前先计时朗读。如果句子比素材长，请缩短文案，而不是越说越快。示例把部分信息交给画面，不逐一描述每一个动作。', '在手机上检查字幕，避免遮挡杯子和取杯动作，并确认平台按钮不会遮住最后一行。关掉声音后再看一遍，检查流程是否仍然清楚。'] },
        { heading: '如果选择AI视频', sample: '竖屏9:16咖啡店特写。窗边简洁柜台上有一个无品牌透明杯，杯内有冰块。一只手慢慢将咖啡倒入杯中。固定镜头、柔和自然侧光、真实液体运动。保持杯子形状和柜台位置。无文字、无标志、不露脸。在加入牛奶前结束，牛奶镜头单独生成。', paragraphs: ['这是可以粘贴到视频工具中的通用提示词，并非已生成的视频。每个镜头只要求一个动作。把倒咖啡、盖杯盖和交接放入一个提示词，会增加检查连续性和替换失败动作的难度。', '如果出现标志、手指、杯子或液体错误，请重新生成或替换镜头。在剪辑软件中添加字幕，以便控制文字和位置。'] },
        { heading: '修改方向和发布检查', paragraphs: ['对于熟悉店铺的观众，可用他们认识的菜单项目替换开场，保留制作过程。对于新观众，结尾展示准确位置。比较反应时，每次只改变开场或结尾中的一项。'], steps: ['确认展示的饮料确实在售。', '使用您有权发布的视频、音乐和品牌素材。', '检查连续性、字幕文字和手机静音预览。', '发布后再评估效果。示例没有真实活动数据，也不保证传播效果。'] },
      ],
    },
  },
  'reference-to-original': {
    en: {
      introduction: 'A reference can help you describe pacing or the order of information. It should not become a template for copying someone else’s footage, words, or identity. The useful question is “What job does this scene do?” rather than “How do I reproduce this exact scene?”',
      sections: [
        { heading: 'Write down functions instead of copied expressions', paragraphs: ['Describe an opening as “show the problem before introducing the product,” not as the other creator’s exact sentence. Describe a transition as “move from problem to demonstration,” not as a request to reproduce a distinctive edit. These notes are about structure.', 'Keep separate notes for what you observed and what you are assuming. A title or description is not evidence that you inspected every frame of a video. If a reference is private, inaccessible, or missing useful text, give your own summary and treat any proposed analysis as uncertain.'] },
        { heading: 'Replace the subject, evidence, and ending', sample: 'Reference structure: everyday problem → visible demonstration → next step\nOriginal brief: a desk becomes crowded during study → show one notebook and one organizer clearing space → invite the viewer to see the setup list\nAssets: your own desk, hands, stationery, and footage\nAvoid: the reference creator’s wording, logo, music, shots, or claimed results', paragraphs: ['The structure gives you three jobs, but your subject and proof determine the actual scenes. Show what your own product or process does. Do not carry over a reference’s discount, rating, or result unless it is also true for your project and you can verify it.'] },
        { heading: 'Adapt meaning before translating sentences', paragraphs: ['First write a plain sentence describing the purpose: “Show how a desk is cleared before studying.” Then draft natural wording in the language you will publish. A translation can preserve words yet lose the reason to watch.'], steps: ['English: “Make room before you start.”', 'Korean: “공부 시작 전, 책상부터 정리해요.”', 'Japanese: “勉強の前に、机をすっきり。”', 'Chinese: “开始学习前，先整理桌面。”'], conclusion: 'These are alternative opening lines for this example, not rules about national audiences. Read each with the intended voice and check whether it fits the shot. A native speaker should review wording, names, units, and the final action when possible.' },
        { heading: 'Use only material you can publish', paragraphs: ['A publicly reachable URL does not itself tell you that you may reuse its footage, music, or brand assets. Use your own material or check the relevant permission. Keep the original reference as a planning note rather than silently turning it into your finished media.', 'If you use a generated shot, inspect it for unintended logos, recognizable people, or misleading details. If the plan makes a factual claim, verify it independently. Describe generated or illustrative examples honestly instead of presenting them as real customer results.'] },
        { heading: 'Review the finished plan for originality', steps: ['Could a viewer understand your own subject without seeing the reference?', 'Does every shot demonstrate something about your own project?', 'Have you rewritten the narration and ending rather than swapping a product name?', 'Can you explain what is observed, assumed, or invented for the example?', 'Are all factual claims and publishable assets accounted for?'], paragraphs: ['Compare versions for clarity and production feasibility first. There is no reliable shortcut from copying a popular structure to obtaining the same performance.'] },
      ],
    },
    ko: {
      introduction: '참고 영상은 속도감이나 정보 순서를 설명하는 데 도움이 됩니다. 다른 사람의 촬영본·문장·정체성을 복제하는 틀이 되어서는 안 됩니다. “이 장면을 똑같이 어떻게 만들까?”보다 “이 장면은 어떤 역할을 할까?”를 질문해 보세요.',
      sections: [
        { heading: '표현을 복사하지 말고 역할을 기록하기', paragraphs: ['첫 장면은 다른 제작자의 정확한 대사 대신 “제품 소개 전에 불편한 상황 보여주기”로 설명합니다. 전환은 독특한 편집을 복제하라는 지시 대신 “문제에서 시연으로 이동하기”로 적습니다. 이렇게 하면 구조를 참고할 수 있습니다.', '관찰한 내용과 추측한 내용을 구분하세요. 제목이나 설명만으로 영상의 모든 프레임을 확인했다고 말할 수는 없습니다. 비공개·접근 불가 영상이거나 사용할 텍스트가 부족하면 직접 요약을 제공하고 분석의 불확실성을 고려하세요.'] },
        { heading: '대상·근거·마무리 새로 만들기', sample: '참고 구조: 일상의 문제 → 시각적인 시연 → 다음 행동\n새 요청: 공부 전 책상이 복잡함 → 공책 하나와 정리함으로 공간 정리 → 준비물 목록 확인 유도\n자료: 직접 촬영한 책상, 손, 문구류\n사용하지 않을 것: 다른 제작자의 대사·로고·음악·장면·성과 주장', paragraphs: ['구조는 세 가지 역할을 주지만 실제 장면은 자신의 대상과 근거로 결정해야 합니다. 자신의 제품이나 과정이 하는 일을 보여주세요. 할인·평점·성과가 참고 영상에 있더라도 자신의 프로젝트에 사실이고 확인 가능한 경우에만 사용합니다.'] },
        { heading: '문장 번역 전에 의미부터 조정하기', paragraphs: ['먼저 “공부 전에 책상을 정리하는 과정을 보여준다”처럼 목적을 평이하게 적습니다. 그다음 게시할 언어로 자연스러운 문장을 만듭니다. 단어를 그대로 번역해도 시청자가 볼 이유가 전달되지 않을 수 있습니다.'], steps: ['영어: “Make room before you start.”', '한국어: “공부 시작 전, 책상부터 정리해요.”', '일본어: “勉強の前に、机をすっきり。”', '중국어: “开始学习前，先整理桌面。”'], conclusion: '이 예시에 사용할 첫 문장 후보이지 국가별 시청자의 성향에 관한 규칙은 아닙니다. 원하는 목소리로 읽고 장면에 맞는지 확인하세요. 가능하면 해당 언어 사용자에게 문장·이름·단위·마지막 행동을 검토받습니다.' },
        { heading: '게시할 수 있는 자료만 사용하기', paragraphs: ['공개 URL이라는 사실만으로 촬영본·음악·브랜드 자료를 재사용해도 된다는 뜻은 아닙니다. 직접 만든 자료를 사용하거나 필요한 허락을 확인하세요. 참고 자료는 기획 메모로 보관하고 완성 영상의 자료로 무단 전환하지 않습니다.', 'AI 장면에는 의도하지 않은 로고·알아볼 수 있는 사람·오해를 부르는 정보가 없는지 확인하세요. 사실을 주장한다면 별도로 검증합니다. 설명용·생성 예시는 실제 고객의 성과처럼 제시하지 말고 성격을 정확하게 표시합니다.'] },
        { heading: '기획의 독창성 점검하기', steps: ['참고 영상을 몰라도 자신의 주제가 이해되는가?', '모든 장면이 자신의 프로젝트에 관해 무언가를 보여주는가?', '제품명만 바꾼 것이 아니라 내레이션과 마무리를 새로 썼는가?', '관찰·추측·설명용으로 만든 요소를 구분해 설명할 수 있는가?', '사실 주장과 게시할 자료를 모두 확인했는가?'], paragraphs: ['먼저 명확성과 제작 가능성을 기준으로 여러 기획을 비교하세요. 인기 영상의 구조를 따라 한다고 같은 성과를 얻을 수 있는 것은 아닙니다.'] },
      ],
    },
    ja: {
      introduction: '参考動画はテンポや情報の順序を説明する手掛かりになります。他人の映像、言葉、個性を複製するひな形にはしないでください。「同じ場面をどう作るか」より「この場面は何を伝えるか」を考えます。',
      sections: [
        { heading: '表現ではなく役割を書き留める', paragraphs: ['冒頭は相手の正確な台詞ではなく「商品紹介の前に困り事を見せる」と記録します。転換は独特の編集の再現ではなく「問題から実演へ移る」と記録します。構成を参考にするためのメモです。', '観察したことと推測を分けましょう。タイトルや説明だけでは動画の全フレームを確認した証拠になりません。非公開、アクセス不可、テキスト不足の場合は自分の要約を渡し、分析の不確実性を考慮します。'] },
        { heading: '対象・根拠・結びを作り直す', sample: '参考の構成：日常の問題 → 目に見える実演 → 次の行動\n新しい依頼：勉強前に机が散らかっている → ノートと収納で場所を空ける → 用具一覧へ案内\n素材：自分の机、手、文具、撮影映像\n使わないもの：他者の台詞、ロゴ、音楽、カット、成果の主張', paragraphs: ['構成は三つの役割を与えますが、具体的な映像は自分の対象と根拠で決めます。参考に割引、評価、成果があっても、自分の企画でも事実であり確認できる場合だけ使います。'] },
        { heading: '文を訳す前に意味を調整する', paragraphs: ['まず「勉強前に机を片付ける過程を見せる」と平易な目的を書き、公開する言語で自然な文を作ります。単語を保っても、見る理由が伝わるとは限りません。'], steps: ['英語：“Make room before you start.”', '韓国語：“공부 시작 전, 책상부터 정리해요.”', '日本語：“勉強の前に、机をすっきり。”', '中国語：“开始学习前，先整理桌面。”'], conclusion: 'この例の冒頭候補であり、国別視聴者の性質を決める規則ではありません。想定する声で読み、カットに合うか確認します。可能ならその言語の話者に文、名前、単位、結びを確認してもらいます。' },
        { heading: '公開できる素材を使う', paragraphs: ['公開URLだけでは映像、音楽、ブランド素材を再利用できると判断できません。自作素材を使うか、必要な許可を確認します。参考は企画メモとして扱い、完成映像へ無断転用しないでください。', '生成カットには意図しないロゴ、人物、誤解を招く情報がないか確認します。事実の主張は別途検証してください。生成例や説明用の例を実際の顧客成果のように提示しないでください。'] },
        { heading: '独自性を確認する', steps: ['参考を見ていなくても自分のテーマが理解できるか。', 'すべてのカットが自分の企画について何か示すか。', '商品名の置き換えだけでなく、台詞と結びを書き直したか。', '観察・推測・説明用の創作を区別できるか。', '事実の主張と素材の公開権限を確認したか。'], paragraphs: ['明確さと制作可能性で企画を比較しましょう。人気動画の構成に似せても、同じ成果を得られるとは限りません。'] },
      ],
    },
    zh: {
      introduction: '参考视频可以帮助表达节奏或信息顺序，但不应成为复制他人画面、台词或身份的模板。更有用的问题是“这个镜头承担什么任务”，而不是“怎样把这个镜头做得一模一样”。',
      sections: [
        { heading: '记录功能，而不是照抄表达', paragraphs: ['把开场描述为“先展示问题，再介绍产品”，不要抄下原作者的句子。把转场描述为“从问题进入演示”，不要要求重现具有辨识度的剪辑。这样的笔记用于理解结构。', '区分观察和推测。标题或简介不能证明您看过视频的每一帧。如果参考内容私密、无法访问或缺少可用文本，请提供自己的摘要，并把分析结果中的不确定部分单独检查。'] },
        { heading: '重新设计主体、证据和结尾', sample: '参考结构：日常问题 → 可见的演示 → 下一步\n原创需求：学习前桌面拥挤 → 用一本笔记本和收纳盒整理空间 → 邀请查看物品清单\n素材：自己的桌子、手、文具和拍摄内容\n避免使用：原作者的台词、标志、音乐、镜头及效果宣传', paragraphs: ['结构提供三个任务，但实际镜头由您的主体和证据决定。展示自己的产品或过程。参考视频中的优惠、评分或效果，只有在您的项目中也属实且可核实时才可使用。'] },
        { heading: '先调整含义，再翻译句子', paragraphs: ['先用简单句说明目的，例如“展示学习前整理桌面的过程”，再用要发布的语言写自然文案。逐字翻译可能保留词语，却丢失观看理由。'], steps: ['英语：“Make room before you start.”', '韩语：“공부 시작 전, 책상부터 정리해요.”', '日语：“勉強の前に、机をすっきり。”', '中文：“开始学习前，先整理桌面。”'], conclusion: '这些只是本示例的开场候选句，不是对各国观众的固定判断。用预期声音朗读，检查是否与镜头匹配。条件允许时，请母语使用者审核措辞、名称、单位和结尾行动。' },
        { heading: '仅使用可以发布的素材', paragraphs: ['公开网址本身不能证明您可以再使用其中的画面、音乐或品牌素材。请使用自己的素材或核查相应许可。把参考内容当作策划笔记，而不是未经许可转成成片素材。', '检查AI镜头中是否出现意外的标志、可识别人物或误导信息。事实性宣传需要独立核实。请如实标注生成示例或教学示例，不要将其包装为真实客户成绩。'] },
        { heading: '检查最终方案的原创性', steps: ['没有看过参考视频的观众，是否也能理解您的主题？', '每个镜头是否都在展示您自己的项目？', '是否重新写了旁白和结尾，而不只是替换产品名？', '能否说明哪些是观察、推测或教学示例中的虚构？', '是否核实了全部事实性宣传和素材发布权限？'], paragraphs: ['先按清晰度和可制作性比较方案。采用热门视频的结构并不是获得同等效果的可靠捷径。'] },
      ],
    },
  },
};
