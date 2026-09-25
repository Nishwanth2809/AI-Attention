const clamp = value => Math.min(1, Math.max(0, value));
export function scoreLandmarks(points, blends = [], previous = 50) {
  if (!points || points.length < 478) return { face: false, score: 0, gaze: 0, posture: 0, eyes: 0, status: 'Away from desk' };
  const ratio = (iris, a, b) => {
    const width = Math.abs(points[b].x - points[a].x);
    return width > .001 ? clamp((points[iris].x - Math.min(points[a].x, points[b].x)) / width) : .5;
  };
  const gazeOffset = Math.abs((ratio(468, 33, 133) + ratio(473, 362, 263)) / 2 - .5);
  const gaze = clamp(1 - gazeOffset * 3);
  const eyeMid = (points[33].x + points[263].x) / 2;
  const eyeWidth = Math.abs(points[263].x - points[33].x) || .1;
  const yaw = Math.abs(points[1].x - eyeMid) / eyeWidth;
  const tilt = Math.abs(points[33].y - points[263].y) / eyeWidth;
  const posture = clamp(1 - yaw * 2 - tilt);
  const blink = name => blends.find(b => b.categoryName === name)?.score || 0;
  const eyes = clamp(1 - (blink('eyeBlinkLeft') + blink('eyeBlinkRight')) / 2);
  const raw = (gaze * .45 + posture * .35 + eyes * .2) * 100;
  const score = Math.round(previous * .65 + raw * .35);
  return { face: true, score, gaze: Math.round(gaze * 100), posture: Math.round(posture * 100), eyes: Math.round(eyes * 100),
    status: score >= 65 ? 'In the zone' : 'A little distracted' };
}
