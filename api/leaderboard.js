let leaderboard = []; // in-memory (reset saat redeploy)

export default function handler(req, res) {
  if (req.method === "POST") {
    const { score = 0, level = 1, badges = 0 } = req.body || {};

    leaderboard.push({
      score,
      level,
      badges,
      time: Date.now()
    });

    // sort: score DESC, level DESC
    leaderboard.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.level - a.level;
    });

    // ambil top 10
    leaderboard = leaderboard.slice(0, 10);

    return res.status(200).json({ success: true });
  }

  if (req.method === "GET") {
    return res.status(200).json(leaderboard);
  }

  return res.status(405).json({ error: "Method not allowed" });
}
