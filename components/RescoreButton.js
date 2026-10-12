'use client';

import { useFormStatus } from 'react-dom';
import { TargetIcon } from './Doodles';

// Submit button for the re-score form; shows progress while Gemini scores
export default function RescoreButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-quiet btn-icon" type="submit" disabled={pending}>
      <TargetIcon />
      {pending ? 'Re-scoring with Gemini…' : 'Re-score with this thesis'}
    </button>
  );
}
