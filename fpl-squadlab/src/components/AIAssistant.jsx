import React, { useMemo, useState } from 'react';

const quickPrompts = [
  'Analyse my team.',
  "Explain my team's strengths and weaknesses.",
  'Compare these two players.',
  'What factors should I consider before making a transfer?'
];

const toNumber = value => Number.parseFloat(value) || 0;

const formatMoney = value => `£${value.toFixed(1)}m`;

const getUpcomingFixtures = (player, fixtures, currentEvent) => fixtures
  .filter(fixture => (fixture.team_h === player.team || fixture.team_a === player.team) && fixture.event > currentEvent)
  .sort((first, second) => first.event - second.event)
  .slice(0, 3);

const AIAssistant = ({ squad = [], data = null, fixtures = [] }) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'I can analyse your squad using live data from SquadLab. Try one of the example questions below.'
    }
  ]);
  const [input, setInput] = useState('');
  const [selectedPrompt, setSelectedPrompt] = useState(null);

  const structuredContext = useMemo(() => {
    if (!data || squad.length === 0) {
      return {
        squad: [],
        playerStatistics: [],
        upcomingFixtures: [],
        squadValue: 0,
        remainingBudget: 0
      };
    }

    const currentEvent = data.events?.find(event => event.is_current)?.id || 0;
    const maxBudget = (data.game_settings?.squad_total_spend || 1000) / 10;

    const playerStatistics = squad.map(player => {
      const teamName = data.teams.find(team => team.id === player.team)?.short_name || data.teams.find(team => team.id === player.team)?.name || 'Unknown';
      const position = data.element_types.find(type => type.id === player.element_type)?.singular_name_short || 'UNK';
      const upcoming = getUpcomingFixtures(player, fixtures, currentEvent);

      return {
        id: player.id,
        name: player.web_name,
        team: teamName,
        position,
        price: toNumber(player.now_cost) / 10,
        points: toNumber(player.total_points),
        form: toNumber(player.form),
        pointsPerGame: toNumber(player.points_per_game),
        minutes: toNumber(player.minutes),
        goals: toNumber(player.goals_scored),
        assists: toNumber(player.assists),
        ownership: toNumber(player.selected_by_percent),
        fixtures: upcoming.map(fixture => ({
          event: fixture.event,
          opponent: fixture.team_h === player.team ? data.teams.find(team => team.id === fixture.team_a)?.short_name || 'TBD' : data.teams.find(team => team.id === fixture.team_h)?.short_name || 'TBD',
          venue: fixture.team_h === player.team ? 'H' : 'A',
          difficulty: fixture.team_h === player.team ? fixture.team_h_difficulty : fixture.team_a_difficulty
        }))
      };
    });

    const squadValue = playerStatistics.reduce((sum, player) => sum + player.price, 0);
    const remainingBudget = maxBudget - squadValue;

    return {
      squad: playerStatistics,
      playerStatistics,
      upcomingFixtures: playerStatistics.flatMap(player => player.fixtures.map(fixture => ({ player: player.name, ...fixture }))),
      squadValue,
      remainingBudget
    };
  }, [data, fixtures, squad]);

  const buildResponse = (prompt, context) => {
    const lowerPrompt = prompt.toLowerCase();

    if (lowerPrompt.includes('analyse my team') || lowerPrompt.includes('strengths and weaknesses')) {
      if (context.squad.length === 0) {
        return 'I need a saved squad to analyse. Add players in Team Builder first.';
      }

      const clubCounts = context.playerStatistics.reduce((acc, player) => {
        acc[player.team] = (acc[player.team] || 0) + 1;
        return acc;
      }, {});
      const topClub = Object.entries(clubCounts).sort((a, b) => b[1] - a[1])[0];
      const expensivePlayers = [...context.playerStatistics].sort((a, b) => b.price - a.price).slice(0, 3);
      const mostRisky = context.playerStatistics.filter(player => player.fixtures.some(fixture => fixture.difficulty >= 4));

      return [
        `Your squad value is ${formatMoney(context.squadValue)} with ${formatMoney(context.remainingBudget)} remaining.`,
        `The squad contains ${context.playerStatistics.length} selected players.`,
        topClub ? `You have ${topClub[1]} players from ${topClub[0]}.` : null,
        `The priciest players currently are ${expensivePlayers.map(player => `${player.name} (${formatMoney(player.price)})`).join(', ')}.`,
        mostRisky.length > 0 ? `${mostRisky.length} selected players have at least one difficult upcoming fixture in the next three fixtures.` : 'No selected players currently show a clearly difficult upcoming fixture pattern in the next three fixtures.',
        'These are observations from available data only, not guarantees about future points.'
      ].filter(Boolean).join(' ');
    }

    if (lowerPrompt.includes('compare')) {
      return 'To compare two players, use the Transfer Comparison section on the Analysis page. It compares price, points, form, points per game, minutes, goals, assists, ownership, and upcoming fixtures using available statistics only.';
    }

    if (lowerPrompt.includes('transfer')) {
      return 'Before a transfer, consider price, recent form, points per game, minutes, season totals, ownership, and fixture difficulty. Fixture difficulty is an estimate based on published FDR ratings, not a prediction.';
    }

    return 'I can explain the squad using live statistics, but I do not predict guaranteed outcomes. Try asking me to analyse your team or explain strengths, weaknesses, or transfer factors.';
  };

  const submitPrompt = (prompt) => {
    const trimmed = prompt.trim();
    if (!trimmed) {
      return;
    }

    const userMessage = { role: 'user', content: trimmed };
    const assistantMessage = { role: 'assistant', content: buildResponse(trimmed, structuredContext) };

    setMessages(current => [...current, userMessage, assistantMessage]);
    setInput('');
    setSelectedPrompt(null);
  };

  return (
    <div className="ai-panel card">
      <div className="ai-panel-header">
        <div>
          <h2>AI Assistant</h2>
          <p>Ask questions about your squad using structured SquadLab data.</p>
        </div>
        <span className="ai-badge">LOCAL DATA</span>
      </div>

      <div className="ai-chat">
        {messages.map((message, index) => (
          <div key={index} className={`ai-message ${message.role}`}>
            {message.content}
          </div>
        ))}
      </div>

      <div className="ai-prompts">
        {quickPrompts.map(prompt => (
          <button
            key={prompt}
            type="button"
            className={`ai-prompt ${selectedPrompt === prompt ? 'active' : ''}`}
            onClick={() => {
              setSelectedPrompt(prompt);
              submitPrompt(prompt);
            }}
          >
            {prompt}
          </button>
        ))}
      </div>

      <form
        className="ai-input-row"
        onSubmit={event => {
          event.preventDefault();
          submitPrompt(input);
        }}
      >
        <input
          type="text"
          value={input}
          onChange={event => setInput(event.target.value)}
          placeholder="Ask about your squad, transfers, or fixtures..."
          className="ai-input"
        />
        <button type="submit" className="ai-send-button">Send</button>
      </form>
    </div>
  );
};

export default AIAssistant;
