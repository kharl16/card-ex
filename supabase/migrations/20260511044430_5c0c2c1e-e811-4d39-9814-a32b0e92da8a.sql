-- Daily quotes shared library
CREATE TABLE public.daily_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text text NOT NULL,
  author text NOT NULL DEFAULT 'Unknown',
  source_url text,
  sort_index integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active quotes"
  ON public.daily_quotes FOR SELECT
  USING (is_active = true OR is_super_admin(auth.uid()));

CREATE POLICY "Super admins manage quotes"
  ON public.daily_quotes FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE TRIGGER update_daily_quotes_updated_at
  BEFORE UPDATE ON public.daily_quotes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_daily_quotes_active_sort ON public.daily_quotes (is_active, sort_index);

-- Seed 42 quotes with author attribution + sourcing links (Wikipedia / Wikiquote where available)
INSERT INTO public.daily_quotes (sort_index, text, author, source_url) VALUES
(1,  'Success is not final, failure is not fatal: it is the courage to continue that counts.', 'Winston Churchill', 'https://en.wikiquote.org/wiki/Winston_Churchill'),
(2,  'The secret of getting ahead is getting started.', 'Mark Twain', 'https://en.wikiquote.org/wiki/Mark_Twain'),
(3,  'Don''t watch the clock; do what it does. Keep going.', 'Sam Levenson', 'https://en.wikiquote.org/wiki/Sam_Levenson'),
(4,  'Your network is your net worth.', 'Porter Gale', 'https://www.portergale.com/book'),
(5,  'The best way to predict the future is to create it.', 'Peter Drucker', 'https://en.wikiquote.org/wiki/Peter_Drucker'),
(6,  'Opportunities don''t happen. You create them.', 'Chris Grosser', 'https://www.goodreads.com/quotes/385280'),
(7,  'Success usually comes to those who are too busy to be looking for it.', 'Henry David Thoreau', 'https://en.wikiquote.org/wiki/Henry_David_Thoreau'),
(8,  'The only place where success comes before work is in the dictionary.', 'Vidal Sassoon', 'https://en.wikiquote.org/wiki/Vidal_Sassoon'),
(9,  'It''s not about ideas. It''s about making ideas happen.', 'Scott Belsky', 'https://www.scottbelsky.com/'),
(10, 'What you do today can improve all your tomorrows.', 'Ralph Marston', 'https://greatday.com/'),
(11, 'Dream big. Start small. Act now.', 'Robin Sharma', 'https://www.robinsharma.com/'),
(12, 'Be so good they can''t ignore you.', 'Steve Martin', 'https://en.wikiquote.org/wiki/Steve_Martin'),
(13, 'Small daily improvements are the key to staggering long-term results.', 'Robin Sharma', 'https://www.robinsharma.com/'),
(14, 'Believe you can and you''re halfway there.', 'Theodore Roosevelt', 'https://en.wikiquote.org/wiki/Theodore_Roosevelt'),
(15, 'The harder you work for something, the greater you''ll feel when you achieve it.', 'Unknown', NULL),
(16, 'Don''t be afraid to give up the good to go for the great.', 'John D. Rockefeller', 'https://en.wikiquote.org/wiki/John_D._Rockefeller'),
(17, 'If you are not willing to risk the usual, you will have to settle for the ordinary.', 'Jim Rohn', 'https://en.wikiquote.org/wiki/Jim_Rohn'),
(18, 'The way to get started is to quit talking and begin doing.', 'Walt Disney', 'https://en.wikiquote.org/wiki/Walt_Disney'),
(19, 'Success is walking from failure to failure with no loss of enthusiasm.', 'Winston Churchill', 'https://en.wikiquote.org/wiki/Winston_Churchill'),
(20, 'Don''t let yesterday take up too much of today.', 'Will Rogers', 'https://en.wikiquote.org/wiki/Will_Rogers'),
(21, 'It''s not whether you get knocked down, it''s whether you get up.', 'Vince Lombardi', 'https://en.wikiquote.org/wiki/Vince_Lombardi'),
(22, 'If you want to lift yourself up, lift up someone else.', 'Booker T. Washington', 'https://en.wikiquote.org/wiki/Booker_T._Washington'),
(23, 'Quality is not an act, it is a habit.', 'Aristotle', 'https://en.wikiquote.org/wiki/Aristotle'),
(24, 'The future depends on what you do today.', 'Mahatma Gandhi', 'https://en.wikiquote.org/wiki/Mahatma_Gandhi'),
(25, 'Whether you think you can or you think you can''t, you''re right.', 'Henry Ford', 'https://en.wikiquote.org/wiki/Henry_Ford'),
(26, 'Discipline is the bridge between goals and accomplishment.', 'Jim Rohn', 'https://en.wikiquote.org/wiki/Jim_Rohn'),
(27, 'Action is the foundational key to all success.', 'Pablo Picasso', 'https://en.wikiquote.org/wiki/Pablo_Picasso'),
(28, 'Hard work beats talent when talent doesn''t work hard.', 'Tim Notke', 'https://www.goodreads.com/quotes/715079'),
(29, 'Do what you can, with what you have, where you are.', 'Theodore Roosevelt', 'https://en.wikiquote.org/wiki/Theodore_Roosevelt'),
(30, 'The expert in anything was once a beginner.', 'Helen Hayes', 'https://en.wikipedia.org/wiki/Helen_Hayes'),
(31, 'Energy and persistence conquer all things.', 'Benjamin Franklin', 'https://en.wikiquote.org/wiki/Benjamin_Franklin'),
(32, 'Champions keep playing until they get it right.', 'Billie Jean King', 'https://en.wikiquote.org/wiki/Billie_Jean_King'),
(33, 'Wake up with determination. Go to bed with satisfaction.', 'George Lorimer', 'https://en.wikipedia.org/wiki/George_Horace_Lorimer'),
(34, 'Done is better than perfect.', 'Sheryl Sandberg', 'https://en.wikiquote.org/wiki/Sheryl_Sandberg'),
(35, 'You miss 100% of the shots you don''t take.', 'Wayne Gretzky', 'https://en.wikiquote.org/wiki/Wayne_Gretzky'),
(36, 'Start where you are. Use what you have. Do what you can.', 'Arthur Ashe', 'https://en.wikiquote.org/wiki/Arthur_Ashe'),
(37, 'Great things never come from comfort zones.', 'Unknown', NULL),
(38, 'Push yourself, because no one else is going to do it for you.', 'Unknown', NULL),
(39, 'Sometimes later becomes never. Do it now.', 'Unknown', NULL),
(40, 'Little by little, a little becomes a lot.', 'Tanzanian Proverb', 'https://en.wikiquote.org/wiki/Tanzanian_proverbs'),
(41, 'If opportunity doesn''t knock, build a door.', 'Milton Berle', 'https://en.wikiquote.org/wiki/Milton_Berle'),
(42, 'Doubt kills more dreams than failure ever will.', 'Suzy Kassem', 'https://en.wikipedia.org/wiki/Suzy_Kassem'),
(43, 'Fall seven times, stand up eight.', 'Japanese Proverb', 'https://en.wiktionary.org/wiki/%E4%B8%83%E8%BB%A2%E5%85%AB%E8%B5%B7');