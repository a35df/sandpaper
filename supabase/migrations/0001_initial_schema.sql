-- 에피소드 테이블 생성
CREATE TABLE episodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 문단 테이블 생성
CREATE TABLE paragraphs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
    content TEXT,
    "order" INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at 컬럼 자동 업데이트를 위한 함수
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 각 테이블에 트리거 적용
CREATE TRIGGER set_episodes_timestamp
BEFORE UPDATE ON episodes
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_paragraphs_timestamp
BEFORE UPDATE ON paragraphs
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- RLS (Row Level Security) 활성화
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE paragraphs ENABLE ROW LEVEL SECURITY;

-- 정책 생성 (지금은 모든 접근을 허용하지만, 실제 앱에서는 인증된 사용자에게만 허용해야 함)
CREATE POLICY "Public episodes are viewable by everyone." ON episodes FOR SELECT USING (true);
CREATE POLICY "Anyone can insert episodes." ON episodes FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update episodes." ON episodes FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete episodes." ON episodes FOR DELETE USING (true);

CREATE POLICY "Public paragraphs are viewable by everyone." ON paragraphs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert paragraphs." ON paragraphs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update paragraphs." ON paragraphs FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete paragraphs." ON paragraphs FOR DELETE USING (true);
