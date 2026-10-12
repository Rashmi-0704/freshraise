import { ensureSchema, getThesis } from '@/lib/db';
import { saveThesis, rescoreNow } from '@/app/actions';
import RescoreButton from '@/components/RescoreButton';
import { ThesisTarget, PenIcon, TargetIcon, GiftIcon } from '@/components/Doodles';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // the re-score button calls Gemini from this page

function Area({ name, label, hint, value, rows = 2 }) {
  return (
    <label className="tfield">
      <span className="tlabel">{label}</span>
      {hint && <span className="thint">{hint}</span>}
      <textarea name={name} defaultValue={value} rows={rows} required />
    </label>
  );
}

export default async function ThesisPage({ searchParams }) {
  let t;
  let error;
  try {
    await ensureSchema();
    t = await getThesis();
  } catch (err) {
    error = err.message;
  }

  return (
    <main className="wrap thesis">
      <div className="thesis-head">
        <div>
          <h1>
            What you’re <span className="mark">looking for</span>
          </h1>
          <p className="lede">
            Every new startup is scored against this. Changes apply from the next check, whether you save here or edit
            the thesis table directly in Neon.
          </p>
        </div>
        <ThesisTarget className="thesis-art" />
      </div>

      {searchParams?.saved && (
        <p className="notice notice-ok" role="status">
          Thesis saved. New startups are scored against it from the next check. To apply it to the ones already
          waiting, use <strong>Re-score with this thesis</strong> below.
        </p>
      )}
      {searchParams?.rescored != null && (
        <p className="notice notice-ok" role="status">
          Re-scored {searchParams.rescored} {searchParams.rescored === '1' ? 'startup' : 'startups'}: {searchParams.fit}{' '}
          now fit and {searchParams.rejected} are set aside (hidden from your brief).
          {Number(searchParams.need) > 0 &&
            ` ${searchParams.need} newly fitting ${searchParams.need === '1' ? 'startup needs' : 'startups need'} a draft; click “Check for new rounds” on the Morning Brief to write ${searchParams.need === '1' ? 'it' : 'them'}.`}
        </p>
      )}
      {searchParams?.rescore_error && (
        <p className="notice notice-error" role="alert">Re-scoring stopped: {searchParams.rescore_error}</p>
      )}
      {error && <p className="notice notice-error">{error}</p>}

      {t && (
        <form action={saveThesis} className="tform">
          <fieldset>
            <legend><PenIcon /> Who’s writing</legend>
            <div className="trow">
              <label className="tfield">
                <span className="tlabel">Accelerator</span>
                <input name="accelerator_name" defaultValue={t.accelerator_name} required />
              </label>
              <label className="tfield">
                <span className="tlabel">Your name</span>
                <input name="sender_name" defaultValue={t.sender_name} required />
              </label>
              <label className="tfield">
                <span className="tlabel">Your title</span>
                <input name="sender_title" defaultValue={t.sender_title} required />
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend><TargetIcon /> Who fits</legend>
            <Area name="sectors" label="Sectors" hint="Comma separated works well." value={t.sectors} />
            <Area name="stages" label="Stages" value={t.stages} rows={1} />
            <Area name="geography" label="Geography" value={t.geography} />
            <Area name="round_size" label="Round size" value={t.round_size} />
            <Area name="exclusions" label="Never interested in" hint="Startups matching these score below 30." value={t.exclusions} />
            <label className="tfield tfield-score">
              <span className="tlabel">Minimum fit score</span>
              <span className="thint">Startups below this score are hidden. 65 is a good balance.</span>
              <input type="number" name="min_fit_score" min="0" max="100" defaultValue={t.min_fit_score} required />
            </label>
          </fieldset>

          <fieldset>
            <legend><GiftIcon /> What you offer</legend>
            <Area
              name="program_pitch"
              label="Program pitch"
              hint="Gemini uses this to explain why founders should talk to you."
              value={t.program_pitch}
              rows={4}
            />
          </fieldset>

          <div className="tfoot">
            <button className="btn btn-sun" type="submit">Save thesis</button>
            <span className="thint">
              Last updated {new Date(t.updated_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}
            </span>
          </div>
        </form>
      )}

      {t && (
        <form action={rescoreNow} className="rescore">
          <div>
            <h2>Changed the thesis?</h2>
            <p className="thint">
              Scores every startup still waiting (and the ones set aside) against the thesis as it is now. Sent and
              skipped startups are never touched, and no startup is ever drafted twice.
            </p>
          </div>
          <RescoreButton />
        </form>
      )}
    </main>
  );
}
