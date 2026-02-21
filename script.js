const fileInput = document.getElementById('fileInput');
const analyzeBtn = document.getElementById('analyzeBtn');
const statusDiv = document.getElementById('status');
const resultsSection = document.getElementById('resultsSection');
const topSongsList = document.getElementById('topSongsList');

let charts = {}; // Store chart instances
let imageCache = {}; // Cache for artist/album images

// Country code to timezone mapping
const countryToTimezone = {
    'US': 'America/New_York', 'GB': 'Europe/London', 'CA': 'America/Toronto', 
    'AU': 'Australia/Sydney', 'JP': 'Asia/Tokyo', 'IN': 'Asia/Kolkata', 
    'DE': 'Europe/Berlin', 'FR': 'Europe/Paris', 'IT': 'Europe/Rome', 
    'ES': 'Europe/Madrid', 'MX': 'America/Mexico_City', 'BR': 'America/Sao_Paulo',
    'ZA': 'Africa/Johannesburg', 'SG': 'Asia/Singapore', 'KR': 'Asia/Seoul',
    'NZ': 'Pacific/Auckland', 'NL': 'Europe/Amsterdam', 'SE': 'Europe/Stockholm',
    'CH': 'Europe/Zurich', 'AT': 'Europe/Vienna', 'PL': 'Europe/Warsaw',
    'RU': 'Europe/Moscow', 'TR': 'Europe/Istanbul', 'UA': 'Europe/Kyiv',
    'CN': 'Asia/Shanghai', 'HK': 'Asia/Hong_Kong', 'TH': 'Asia/Bangkok',
    'MY': 'Asia/Kuala_Lumpur', 'ID': 'Asia/Jakarta', 'PH': 'Asia/Manila',
    'VN': 'Asia/Ho_Chi_Minh', 'IL': 'Asia/Jerusalem', 'AE': 'Asia/Dubai',
    'SA': 'Asia/Riyadh', 'NG': 'Africa/Lagos', 'EG': 'Africa/Cairo',
    'KE': 'Africa/Nairobi', 'AR': 'America/Argentina/Buenos_Aires', 'CL': 'America/Santiago',
    'CO': 'America/Bogota', 'PE': 'America/Lima', 'CZ': 'Europe/Prague',
    'PT': 'Europe/Lisbon', 'GR': 'Europe/Athens', 'HU': 'Europe/Budapest',
    'IE': 'Europe/Dublin', 'DK': 'Europe/Copenhagen', 'NO': 'Europe/Oslo',
    'FI': 'Europe/Helsinki', 'BE': 'Europe/Brussels', 'LU': 'Europe/Luxembourg'
};

// Function to get local date from UTC timestamp and country code
function getLocalDateFromUTC(utcDate, countryCode) {
    const timezone = countryToTimezone[countryCode] || 'UTC';
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
    
    const parts = formatter.formatToParts(utcDate);
    const date = {};
    parts.forEach(part => {
        if (part.type === 'year') date.year = parseInt(part.value);
        if (part.type === 'month') date.month = parseInt(part.value) - 1;
        if (part.type === 'day') date.day = parseInt(part.value);
        if (part.type === 'hour') date.hour = parseInt(part.value);
        if (part.type === 'minute') date.minute = parseInt(part.value);
        if (part.type === 'second') date.second = parseInt(part.value);
    });
    
    return {
        year: date.year,
        month: date.month,
        day: date.day,
        hour: date.hour,
        minute: date.minute,
        second: date.second,
        dayOfWeek: getLocalDayOfWeek(utcDate, countryCode)
    };
}

// Function to get day of week in local timezone
function getLocalDayOfWeek(utcDate, countryCode) {
    const timezone = countryToTimezone[countryCode] || 'UTC';
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        weekday: 'long'
    });
    
    const dayName = formatter.format(utcDate);
    const dayMap = { 'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6 };
    return dayMap[dayName] || 0;
}

// Configure Chart.js default font
Chart.defaults.font.family = "'Poppins', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
Chart.defaults.font.size = 13;
Chart.defaults.font.weight = '600';
Chart.defaults.color = '#ffffff';

// Enable analyze button when files are selected
fileInput.addEventListener('change', function() {
    analyzeBtn.disabled = this.files.length === 0;
    const fileLabel = document.querySelector('.file-input-label span');
    if (this.files.length > 0) {
        fileLabel.textContent = `📁 ${this.files.length} file${this.files.length > 1 ? 's' : ''} selected`;
    } else {
        fileLabel.textContent = '📁 Select Spotify Files';
    }
});

analyzeBtn.addEventListener('click', analyzeFiles);

async function analyzeFiles() {
    try {
        statusDiv.textContent = 'Processing files...';
        resultsSection.classList.remove('show');
        
        const files = fileInput.files;
        const songStats = {};
        const artistStats = {};
        const allEntries = [];
        
        // Process each file
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const jsonData = await readFile(file);
            
            // Parse the JSON array
            let data;
            try {
                data = JSON.parse(jsonData);
            } catch (e) {
                statusDiv.textContent = `Error parsing ${file.name}: ${e.message}`;
                return;
            }
            
            // Aggregate song data
            if (Array.isArray(data)) {
                data.forEach(entry => {
                    allEntries.push(entry);
                    
                    const trackName = entry.master_metadata_track_name;
                    const artist = entry.master_metadata_album_artist_name;
                    const msPlayed = entry.ms_played || 0;
                    
                    // Skip entries without track name (podcasts, etc.)
                    if (!trackName || !artist) return;
                    
                    const songKey = `${trackName} - ${artist}`;
                    
                    if (!songStats[songKey]) {
                        songStats[songKey] = {
                            track: trackName,
                            artist: artist,
                            totalMs: 0,
                            playCount: 0
                        };
                    }
                    
                    songStats[songKey].totalMs += msPlayed;
                    songStats[songKey].playCount += 1;
                    
                    // Artist stats
                    if (!artistStats[artist]) {
                        artistStats[artist] = {
                            name: artist,
                            totalMs: 0,
                            playCount: 0,
                            uniqueSongs: new Set()
                        };
                    }
                    artistStats[artist].totalMs += msPlayed;
                    artistStats[artist].playCount += 1;
                    artistStats[artist].uniqueSongs.add(trackName);
                });
            }
        }
        
        if (allEntries.length === 0) {
            statusDiv.textContent = 'No song data found in the uploaded files.';
            return;
        }
        
        // Convert artists to array and get unique song count
        const artistsArray = Object.values(artistStats).map(a => ({
            ...a,
            uniqueSongs: a.uniqueSongs.size
        }));
        
        // Convert to array and sort by total milliseconds played
        const topSongs = Object.values(songStats)
            .sort((a, b) => b.totalMs - a.totalMs)
            .slice(0, 10);
        
        // Calculate all statistics
        const stats = calculateAllStats(allEntries, songStats, artistsArray, topSongs);
        
        // Display results
        await displayResults(topSongs, stats);
        statusDiv.textContent = '';
        
    } catch (error) {
        statusDiv.textContent = `Error: ${error.message}`;
    }
}

function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error(`Failed to read file: ${file.name}`));
        reader.readAsText(file);
    });
}

function calculateAllStats(allEntries, songStats, artistsArray, topSongs) {
    // Overall stats
    const totalListeningMs = allEntries.reduce((sum, e) => sum + (e.ms_played || 0), 0);
    const totalDays = Math.floor(totalListeningMs / (1000 * 60 * 60 * 24));
    const totalHours = Math.floor(totalListeningMs / (1000 * 60 * 60));
    const totalMinutes = Math.floor(totalListeningMs / (1000 * 60));
    const totalSongs = allEntries.filter(e => e.master_metadata_track_name).length;
    const uniqueSongs = Object.keys(songStats).length;
    const uniqueArtists = artistsArray.length;
    
    // Listening by day of week (converted to local timezone based on country)
    const dayStats = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const hourStats = {};
    for (let i = 0; i < 24; i++) hourStats[i] = 0;
    
    allEntries.forEach(e => {
        if (!e.ts) return;
        const date = new Date(e.ts);
        const countryCode = e.conn_country || 'UTC';
        const localDate = getLocalDateFromUTC(date, countryCode);
        
        dayStats[localDate.dayOfWeek] += (e.ms_played || 0);
        hourStats[localDate.hour] += (e.ms_played || 0);
    });
    
    // Year by year stats (converted to local timezone based on country)
    const yearStats = {};
    allEntries.forEach(e => {
        if (!e.ts) return;
        const utcDate = new Date(e.ts);
        const countryCode = e.conn_country || 'UTC';
        const localDate = getLocalDateFromUTC(utcDate, countryCode);
        const year = localDate.year;
        
        if (!yearStats[year]) {
            yearStats[year] = {
                totalMs: 0,
                playCount: 0,
                uniqueSongs: new Set(),
                uniqueArtists: new Set()
            };
        }
        yearStats[year].totalMs += (e.ms_played || 0);
        yearStats[year].playCount += 1;
        if (e.master_metadata_track_name) yearStats[year].uniqueSongs.add(e.master_metadata_track_name);
        if (e.master_metadata_album_artist_name) yearStats[year].uniqueArtists.add(e.master_metadata_album_artist_name);
    });
    
    // Top artists
    const topArtists = artistsArray.sort((a, b) => b.totalMs - a.totalMs).slice(0, 10);
    
    // Find most active day and hour
    const mostActiveDay = Object.entries(dayStats).reduce((a, b) => b[1] > a[1] ? b : a);
    const mostActiveHour = Object.entries(hourStats).reduce((a, b) => b[1] > a[1] ? b : a);
    
    // Skipped songs stats
    const skippedCount = allEntries.filter(e => e.skipped).length;
    const skippedPercentage = ((skippedCount / totalSongs) * 100).toFixed(1);
    
    // Average song length in played tracks
    const avgMsPerPlay = totalListeningMs / totalSongs;
    const avgMinPerPlay = Math.floor(avgMsPerPlay / (1000 * 60));
    const avgSecPerPlay = Math.floor((avgMsPerPlay % (1000 * 60)) / 1000);
    
    // Offline listening
    const offlineCount = allEntries.filter(e => e.offline).length;
    const offlinePercentage = ((offlineCount / totalSongs) * 100).toFixed(1);
    
    // Platforms
    const platformStats = {};
    allEntries.forEach(e => {
        if (e.platform) {
            platformStats[e.platform] = (platformStats[e.platform] || 0) + 1;
        }
    });
    const topPlatforms = Object.entries(platformStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([platform, count]) => ({ platform, count }));
    
    // Countries
    const countryStats = {};
    allEntries.forEach(e => {
        if (e.conn_country) {
            countryStats[e.conn_country] = (countryStats[e.conn_country] || 0) + 1;
        }
    });
    const uniqueCountries = Object.keys(countryStats).length;
    const topCountries = Object.entries(countryStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([country, count]) => ({ country, count }));
    
    // Fun stats
    const shuffleCount = allEntries.filter(e => e.shuffle).length;
    const shufflePercentage = ((shuffleCount / totalSongs) * 100).toFixed(1);
    const incognitoCount = allEntries.filter(e => e.incognito_mode).length;
    const incognitoPercentage = ((incognitoCount / totalSongs) * 100).toFixed(1);
    
    // Most replayed songs
    const mostReplayed = Object.values(songStats).reduce((max, song) => 
        song.playCount > max.playCount ? song : max
    );
    
    // Artist with most unique songs
    const artistMostSongs = topArtists.reduce((max, artist) =>
        artist.uniqueSongs > max.uniqueSongs ? artist : max
    );
    
    // Extreme stats
    const longestSong = Object.values(songStats).reduce((max, song) =>
        song.totalMs > max.totalMs ? song : max
    );
    
    // One-shot songs (played only once)
    const oneShotSongs = Object.values(songStats).filter(s => s.playCount === 1).length;
    
    // Multiple play stats
    const songsPlayedMoreThan10 = Object.values(songStats).filter(s => s.playCount > 10).length;
    const songsPlayedMoreThan50 = Object.values(songStats).filter(s => s.playCount > 50).length;
    const songsPlayedMoreThan100 = Object.values(songStats).filter(s => s.playCount > 100).length;
    
    // Average plays per song
    const avgPlaysPerSong = (totalSongs / uniqueSongs).toFixed(2);
    
    // Busiest times
    const busiestMonth = findBusiestMonth(allEntries);
    const quietestHour = findQuietestHour(hourStats);
    
    // Skipped vs completed
    const completedSongs = allEntries.filter(e => !e.skipped && e.ms_played > 0).length;
    const completedPercentage = ((completedSongs / totalSongs) * 100).toFixed(1);
    
    // Zero play duration (skipped immediately)
    const instantSkips = allEntries.filter(e => e.ms_played === 0).length;
    
    // Songs by album artist
    const albumStats = {};
    allEntries.forEach(e => {
        if (e.master_metadata_album_album_name && e.master_metadata_album_artist_name) {
            const albumKey = `${e.master_metadata_album_album_name} - ${e.master_metadata_album_artist_name}`;
            if (!albumStats[albumKey]) {
                albumStats[albumKey] = {
                    name: e.master_metadata_album_album_name,
                    artist: e.master_metadata_album_artist_name,
                    playCount: 0,
                    totalMs: 0,
                    uniqueSongs: new Set()
                };
            }
            albumStats[albumKey].playCount += 1;
            albumStats[albumKey].totalMs += (e.ms_played || 0);
            if (e.master_metadata_track_name) albumStats[albumKey].uniqueSongs.add(e.master_metadata_track_name);
        }
    });
    
    const albumsArray = Object.values(albumStats).map(a => ({
        ...a,
        uniqueSongs: a.uniqueSongs.size
    }));
    const topAlbums = albumsArray.sort((a, b) => b.totalMs - a.totalMs).slice(0, 10);
    
    // Never skipped songs
    const neverSkippedStats = {};
    const skippedSongNames = new Set();
    allEntries.forEach(e => {
        if (e.skipped && e.master_metadata_track_name) {
            skippedSongNames.add(`${e.master_metadata_track_name} - ${e.master_metadata_album_artist_name}`);
        }
    });
    const neverSkippedSongs = Object.values(songStats).filter(s => {
        return !skippedSongNames.has(`${s.track} - ${s.artist}`);
    }).length;
    
    // Most skipped songs
    const skippedTracksMap = {};
    allEntries.forEach(e => {
        if (e.skipped && e.master_metadata_track_name) {
            const key = `${e.master_metadata_track_name} - ${e.master_metadata_album_artist_name}`;
            skippedTracksMap[key] = (skippedTracksMap[key] || 0) + 1;
        }
    });
    const mostSkippedSong = Object.entries(skippedTracksMap).length > 0 ? 
        Object.entries(skippedTracksMap).sort((a, b) => b[1] - a[1])[0] : 
        null;
    
    // Time ranges
    const timestamps = allEntries.filter(e => e.ts).map(e => new Date(e.ts));
    const firstListen = timestamps.length > 0 ? new Date(Math.min(...timestamps.map(d => d.getTime()))) : null;
    const lastListen = timestamps.length > 0 ? new Date(Math.max(...timestamps.map(d => d.getTime()))) : null;
    const daysSinceStarted = (firstListen && lastListen) ? Math.floor((lastListen - firstListen) / (1000 * 60 * 60 * 24)) : 0;
    
    // Early morning listeners (4-8am)
    const earlyMorningMs = Object.entries(hourStats).filter(([h]) => h >= 4 && h < 8)
        .reduce((sum, [, ms]) => sum + ms, 0);
    const lateNightMs = Object.entries(hourStats).filter(([h]) => h >= 22 || h < 4)
        .reduce((sum, [, ms]) => sum + ms, 0);
    
    // Weekday vs weekend
    const weekdayMs = [1, 2, 3, 4, 5].reduce((sum, day) => sum + dayStats[day], 0);
    const weekendMs = dayStats[0] + dayStats[6];
    const weekdayPercentage = ((weekdayMs / totalListeningMs) * 100).toFixed(1);
    
    // Repeat artist count
    const topArtistCount = topArtists.slice(0, 5).length;
    
    // Most variety in a day (converted to local timezone based on country)
    const dayVariety = {};
    allEntries.forEach(e => {
        if (e.ts) {
            const utcDate = new Date(e.ts);
            const countryCode = e.conn_country || 'UTC';
            const localDate = getLocalDateFromUTC(utcDate, countryCode);
            const day = `${localDate.year}-${String(localDate.month + 1).padStart(2, '0')}-${String(localDate.day).padStart(2, '0')}`;
            
            if (!dayVariety[day]) dayVariety[day] = new Set();
            if (e.master_metadata_track_name) dayVariety[day].add(e.master_metadata_track_name);
        }
    });
    const mostVarietyDay = Object.entries(dayVariety).sort((a, b) => b[1].size - a[1].size)[0];
    
    // Episode/Podcast listening
    const episodeCount = allEntries.filter(e => e.episode_name).length;
    const episodePercentage = ((episodeCount / allEntries.length) * 100).toFixed(1);
    
    // Average listen-through percentage
    const avgListenThroughPercentage = calculateAvgListenThrough(allEntries, songStats);
    
    // Reason to start most common
    const reasonStats = {};
    allEntries.forEach(e => {
        if (e.reason_start) reasonStats[e.reason_start] = (reasonStats[e.reason_start] || 0) + 1;
    });
    const topReason = Object.entries(reasonStats).sort((a, b) => b[1] - a[1])[0];
    
    // Monthly listening (converted to local timezone based on country)
    const monthlyStats = {};
    allEntries.forEach(e => {
        if (e.ts) {
            const utcDate = new Date(e.ts);
            const countryCode = e.conn_country || 'UTC';
            const localDate = getLocalDateFromUTC(utcDate, countryCode);
            const month = `${localDate.year}-${String(localDate.month + 1).padStart(2, '0')}`;
            monthlyStats[month] = (monthlyStats[month] || 0) + 1;
        }
    });
    const avgPlaysPerMonth = (Object.values(monthlyStats).reduce((a, b) => a + b, 0) / Object.keys(monthlyStats).length).toFixed(0);
    
    return {
        totalListeningMs,
        totalDays,
        totalHours,
        totalMinutes,
        totalSongs,
        uniqueSongs,
        uniqueArtists,
        dayStats,
        dayNames,
        hourStats,
        yearStats,
        topArtists,
        topAlbums,
        albumsArray,
        monthlyStats,
        mostActiveDay,
        mostActiveHour,
        dayNames,
        skippedCount,
        skippedPercentage,
        avgMinPerPlay,
        avgSecPerPlay,
        offlineCount,
        offlinePercentage,
        topPlatforms,
        uniqueCountries,
        topCountries,
        shufflePercentage,
        incognitoPercentage,
        mostReplayed,
        artistMostSongs,
        longestSong,
        oneShotSongs,
        songsPlayedMoreThan10,
        songsPlayedMoreThan50,
        songsPlayedMoreThan100,
        avgPlaysPerSong,
        busiestMonth,
        quietestHour,
        completedSongs,
        completedPercentage,
        instantSkips,
        neverSkippedSongs,
        mostSkippedSong,
        firstListen,
        lastListen,
        daysSinceStarted,
        earlyMorningMs,
        lateNightMs,
        weekdayPercentage,
        mostVarietyDay,
        episodeCount,
        episodePercentage,
        avgListenThroughPercentage,
        topReason,
        avgPlaysPerMonth
    };
}

function findBusiestMonth(entries) {
    const months = {};
    entries.forEach(e => {
        if (e.ts) {
            const utcDate = new Date(e.ts);
            const countryCode = e.conn_country || 'UTC';
            const localDate = getLocalDateFromUTC(utcDate, countryCode);
            const month = `${localDate.year}-${String(localDate.month + 1).padStart(2, '0')}`;
            months[month] = (months[month] || 0) + (e.ms_played || 0);
        }
    });
    const busiest = Object.entries(months).sort((a, b) => b[1] - a[1])[0];
    return busiest ? { month: busiest[0], ms: busiest[1] } : null;
}

function findQuietestHour(hourStats) {
    return Object.entries(hourStats)
        .filter(([_, ms]) => ms > 0)
        .reduce((min, curr) => curr[1] < min[1] ? curr : min)[0];
}

function calculateAvgListenThrough(entries, songStats) {
    let totalDuration = 0;
    let countedEntries = 0;
    
    entries.forEach(e => {
        if (e.master_metadata_track_name && e.master_metadata_album_artist_name) {
            const key = `${e.master_metadata_track_name} - ${e.master_metadata_album_artist_name}`;
            const song = songStats[key];
            if (song && e.ms_played > 0) {
                totalDuration += e.ms_played;
                countedEntries++;
            }
        }
    });
    
    return countedEntries > 0 ? (totalDuration / countedEntries / 1000 / 60).toFixed(1) : 0;
}

async function displayResults(topSongs, stats) {
    // Destroy existing charts to avoid duplicates
    Object.values(charts).forEach(chart => chart?.destroy());
    charts = {};
    
    // Display top songs
    topSongsList.innerHTML = '';
    for (const song of topSongs) {
        const hours = Math.floor(song.totalMs / (1000 * 60 * 60));
        const minutes = Math.floor((song.totalMs % (1000 * 60 * 60)) / (1000 * 60));
        const songImage = await fetchImage('track', `${song.track} ${song.artist}`);
        
        const li = document.createElement('li');
        li.innerHTML = `
            <div style="display: flex; gap: 15px; margin-bottom: 15px; align-items: flex-start;">
                ${songImage ? `<img src="${songImage}" alt="${song.track}" style="width: 120px; height: 120px; border-radius: 8px; object-fit: cover; flex-shrink: 0;">` : `<div style="width: 120px; height: 120px; border-radius: 8px; background: linear-gradient(135deg, ${getColorFromText(song.track)}, ${getColorFromText(song.artist)}); display: flex; align-items: center; justify-content: center; font-size: 0.8em; color: white; text-align: center; padding: 5px; word-break: break-word; flex-shrink: 0;"><strong>${(song.track + ' ' + song.artist).substring(0, 20)}</strong></div>`}
                <div style="flex: 1;">
                    <strong style="font-size: 1.1em; color: #1ed760;">${song.track}</strong>
                    <div style="color: #b3b3b3; margin: 5px 0;">by ${song.artist}</div>
                    <small style="color: #b3b3b3;">Played ${song.playCount} times · ${hours}h ${minutes}m total</small>
                </div>
            </div>
        `;
        topSongsList.appendChild(li);
    }
    
    // Top songs chart
    const topSongsLabels = topSongs.map(s => s.track);
    const topSongsData = topSongs.map(s => Math.floor(s.totalMs / (1000 * 60)));
    const songCtx = document.getElementById('topSongsChart').getContext('2d');
    charts.topSongs = new Chart(songCtx, {
        type: 'bar',
        data: {
            labels: topSongsLabels,
            datasets: [{
                label: 'Minutes Played',
                data: topSongsData,
                backgroundColor: 'rgba(29, 185, 84, 0.6)',
                borderColor: 'rgba(29, 185, 84, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            plugins: { legend: { display: false } }
        }
    });
    
    // Top artists chart
    const topArtistsLabels = stats.topArtists.slice(0, 10).map(a => a.name);
    const topArtistsData = stats.topArtists.slice(0, 10).map(a => Math.floor(a.totalMs / (1000 * 60 * 60)));
    const artistCtx = document.getElementById('topArtistsChart').getContext('2d');
    charts.topArtists = new Chart(artistCtx, {
        type: 'doughnut',
        data: {
            labels: topArtistsLabels,
            datasets: [{
                data: topArtistsData,
                backgroundColor: [
                    'rgba(29, 185, 84, 0.8)',
                    'rgba(191, 90, 242, 0.8)',
                    'rgba(29, 160, 242, 0.8)',
                    'rgba(255, 184, 82, 0.8)',
                    'rgba(30, 215, 96, 0.8)',
                    'rgba(244, 67, 54, 0.8)',
                    'rgba(255, 235, 59, 0.8)',
                    'rgba(76, 175, 80, 0.8)',
                    'rgba(63, 81, 181, 0.8)',
                    'rgba(255, 152, 0, 0.8)'
                ]
            }]
        },
        options: { responsive: true }
    });
    
    // Top albums chart
    const topAlbumsLabels = stats.topAlbums.slice(0, 10).map(a => a.name);
    const topAlbumsData = stats.topAlbums.slice(0, 10).map(a => a.playCount);
    const albumCtx = document.getElementById('topAlbumsChart').getContext('2d');
    charts.topAlbums = new Chart(albumCtx, {
        type: 'bar',
        data: {
            labels: topAlbumsLabels,
            datasets: [{
                label: 'Plays',
                data: topAlbumsData,
                backgroundColor: 'rgba(191, 90, 242, 0.6)',
                borderColor: 'rgba(191, 90, 242, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            plugins: { 
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.parsed.x + ' plays';
                        }
                    }
                }
            }
        }
    });
    
    // Day of week chart
    const dayCtx = document.getElementById('dayOfWeekChart').getContext('2d');
    const dayHours = Object.entries(stats.dayStats).map(([_, ms]) => Math.floor(ms / (1000 * 60 * 60)));
    charts.dayOfWeek = new Chart(dayCtx, {
        type: 'line',
        data: {
            labels: stats.dayNames,
            datasets: [{
                label: 'Hours Listened (Local Time)',
                data: dayHours,
                borderColor: 'rgba(29, 185, 84, 1)',
                backgroundColor: 'rgba(29, 185, 84, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: { 
                legend: { display: true },
                tooltip: {
                    callbacks: {
                        afterLabel: function() {
                            return '(based on country timezone)';
                        }
                    }
                }
            }
        }
    });
    
    // Hour of day chart
    const hourCtx = document.getElementById('hourOfDayChart').getContext('2d');
    const hourLabels = Array.from({length: 24}, (_, i) => `${i}:00`);
    const hourData = Array.from({length: 24}, (_, i) => Math.floor((stats.hourStats[i] || 0) / (1000 * 60 * 60)));
    charts.hourOfDay = new Chart(hourCtx, {
        type: 'bar',
        data: {
            labels: hourLabels,
            datasets: [{
                label: 'Hours Listened (Local Time)',
                data: hourData,
                backgroundColor: 'rgba(29, 160, 242, 0.6)',
                borderColor: 'rgba(29, 160, 242, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: { 
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        afterLabel: function() {
                            return '(based on country timezone)';
                        }
                    }
                }
            }
        }
    });
    
    // Yearly chart
    const years = Object.keys(stats.yearStats).sort();
    const yearlyHours = years.map(y => Math.floor(stats.yearStats[y].totalMs / (1000 * 60 * 60)));
    const yearCtx = document.getElementById('yearlyChartHours').getContext('2d');
    charts.yearly = new Chart(yearCtx, {
        type: 'bar',
        data: {
            labels: years,
            datasets: [{
                label: 'Hours Listened',
                data: yearlyHours,
                backgroundColor: 'rgba(255, 152, 0, 0.6)',
                borderColor: 'rgba(255, 152, 0, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: true } }
        }
    });
    
    // Skip rate chart
    const skipCtx = document.getElementById('skipRateChart').getContext('2d');
    const skipPercentage = parseFloat(stats.skippedPercentage);
    charts.skipRate = new Chart(skipCtx, {
        type: 'doughnut',
        data: {
            labels: ['Completed', 'Skipped'],
            datasets: [{
                data: [100 - skipPercentage, skipPercentage],
                backgroundColor: [
                    'rgba(76, 175, 80, 0.8)',
                    'rgba(244, 67, 54, 0.8)'
                ]
            }]
        },
        options: { responsive: true }
    });
    
    // Mode chart (shuffle, offline, incognito)
    const modeCtx = document.getElementById('modeChart').getContext('2d');
    const shufflePerc = parseFloat(stats.shufflePercentage);
    const offlinePerc = parseFloat(stats.offlinePercentage);
    charts.mode = new Chart(modeCtx, {
        type: 'bar',
        data: {
            labels: ['Shuffle', 'Offline', 'Incognito'],
            datasets: [{
                label: '% of Plays',
                data: [shufflePerc, offlinePerc, parseFloat(stats.incognitoPercentage)],
                backgroundColor: [
                    'rgba(255, 235, 59, 0.6)',
                    'rgba(244, 67, 54, 0.6)',
                    'rgba(63, 81, 181, 0.6)'
                ],
                borderColor: [
                    'rgba(255, 235, 59, 1)',
                    'rgba(244, 67, 54, 1)',
                    'rgba(63, 81, 181, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } }
        }
    });
    
    // Play frequency distribution
    const freqCtx = document.getElementById('playFrequencyChart').getContext('2d');
    charts.playFrequency = new Chart(freqCtx, {
        type: 'bar',
        data: {
            labels: ['1x', '2-10x', '11-50x', '51-100x', '100+x'],
            datasets: [{
                label: 'Number of Songs',
                data: [
                    stats.oneShotSongs,
                    stats.songsPlayedMoreThan10 - stats.songsPlayedMoreThan50,
                    stats.songsPlayedMoreThan50 - stats.songsPlayedMoreThan100,
                    stats.songsPlayedMoreThan100,
                    0
                ],
                backgroundColor: 'rgba(191, 90, 242, 0.6)',
                borderColor: 'rgba(191, 90, 242, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } }
        }
    });
    
    // Monthly activity chart
    const monthlyCtx = document.getElementById('monthlyActivityChart').getContext('2d');
    const monthlyLabels = Object.keys(stats.monthlyStats).sort();
    const monthlyData = monthlyLabels.map(m => stats.monthlyStats[m]);
    charts.monthly = new Chart(monthlyCtx, {
        type: 'line',
        data: {
            labels: monthlyLabels.map(m => m.substring(5) + '/' + m.substring(0, 4)),
            datasets: [{
                label: 'Plays',
                data: monthlyData,
                borderColor: 'rgba(29, 185, 84, 1)',
                backgroundColor: 'rgba(29, 185, 84, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: true } }
        }
    });
    
    // Display overall stats
    const overallStatsDiv = document.getElementById('overallStats');
    overallStatsDiv.innerHTML = `
        ${createStatCard('Total Listening Time', `${stats.totalDays} days<br>(${stats.totalHours}h)`)}
        ${createStatCard('Total Plays', stats.totalSongs.toLocaleString())}
        ${createStatCard('Unique Songs', stats.uniqueSongs.toLocaleString())}
        ${createStatCard('Unique Artists', stats.uniqueArtists.toLocaleString())}
        ${createStatCard('Unique Albums', stats.albumsArray.length.toLocaleString())}
        ${createStatCard('Avg Per Play', `${stats.avgMinPerPlay}m<br>${stats.avgSecPerPlay}s`)}
        ${createStatCard('Countries', stats.uniqueCountries)}
    `;
    
    // Display top artists
    const topArtistsDiv = document.getElementById('topArtists');
    topArtistsDiv.innerHTML = '';
    let artistsHtml = '';
    
    for (let i = 0; i < stats.topArtists.length; i++) {
        const artist = stats.topArtists[i];
        const hours = Math.floor(artist.totalMs / (1000 * 60 * 60));
        const artistImage = await fetchImage('artist', artist.name);
        artistsHtml += createStatCardWithImage(
            `${i + 1}. ${artist.name}`,
            `${hours}h · ${artist.uniqueSongs} songs`,
            artistImage
        );
    }
    topArtistsDiv.innerHTML = artistsHtml;
    
    // Display listening habits
    const listeningHabitsDiv = document.getElementById('listeningHabits');
    const mostActiveDayName = stats.dayNames[stats.mostActiveDay[0]];
    const mostActiveDayHours = Math.floor(stats.mostActiveDay[1] / (1000 * 60 * 60));
    const mostActiveHourNum = stats.mostActiveHour[0];
    const mostActiveHourMs = stats.mostActiveHour[1];
    const mostActiveHourHour = Math.floor(mostActiveHourMs / (1000 * 60 * 60));
    
    listeningHabitsDiv.innerHTML = `
        ${createStatCard('Most Active Day', `${mostActiveDayName} (${mostActiveDayHours}h)`)}
        ${createStatCard('Most Active Hour', `${mostActiveHourNum}:00 Local Time (${mostActiveHourHour}h)`)}
        ${createStatCard('Skipped Songs', `${stats.skippedCount} (${stats.skippedPercentage}%)`)}
        ${createStatCard('Offline Listening', `${stats.offlinePercentage}% of plays`)}
        ${createStatCard('Shuffle Mode', `${stats.shufflePercentage}% of plays`)}
        ${createStatCard('Incognito Mode', `${stats.incognitoPercentage}% of plays`)}
        <h4>Top Platforms</h4>
        ${stats.topPlatforms.map((p, i) => createStatCard(`${i + 1}. ${p.platform}`, `${p.count} plays`)).join('')}
        <h4>Top Countries</h4>
        ${stats.topCountries.map((c, i) => createStatCard(`${i + 1}. ${c.country}`, `${c.count} plays`)).join('')}
    `;
    
    // Display year by year stats
    const yearlyStatsDiv = document.getElementById('yearlyStats');
    const sortedYears = Object.keys(stats.yearStats).sort();
    let yearlyHtml = '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">';
    sortedYears.forEach(year => {
        const yearData = stats.yearStats[year];
        const hours = Math.floor(yearData.totalMs / (1000 * 60 * 60));
        yearlyHtml += createStatCard(
            `${year}`,
            `${hours}h · ${yearData.playCount.toLocaleString()} plays · ${yearData.uniqueSongs.size} unique songs`
        );
    });
    yearlyHtml += '</div>';
    yearlyStatsDiv.innerHTML = yearlyHtml;
    
    // Display fun stats
    const funStatsDiv = document.getElementById('funStats');
    const mostReplayedHours = Math.floor(stats.mostReplayed.totalMs / (1000 * 60 * 60));
    const longestSongHours = Math.floor(stats.longestSong.totalMs / (1000 * 60 * 60));
    const longestSongMins = Math.floor((stats.longestSong.totalMs % (1000 * 60 * 60)) / (1000 * 60));
    const busyMonthHours = stats.busiestMonth ? Math.floor(stats.busiestMonth.ms / (1000 * 60 * 60)) : 0;
    const quietestHourNum = parseInt(stats.quietestHour);
    const earlyMorningHours = Math.floor(stats.earlyMorningMs / (1000 * 60 * 60));
    const lateNightHours = Math.floor(stats.lateNightMs / (1000 * 60 * 60));
    const mostSkippedInfo = stats.mostSkippedSong ? 
        `${stats.mostSkippedSong[0].split(' - ')[0]} (${stats.mostSkippedSong[1]}x)` : 
        'No data';
    const mostVarietyInfo = stats.mostVarietyDay ? 
        `${stats.mostVarietyDay[0]} with ${stats.mostVarietyDay[1].size} songs` : 
        'N/A';
    const topReasonStr = stats.topReason ? stats.topReason[0] : 'N/A';
    const topAlbumStr = stats.topAlbums.length > 0 ? 
        `${stats.topAlbums[0].name} - ${stats.topAlbums[0].artist}` : 
        'N/A';
    
    // Fetch images for featured stats
    const mostReplayedImg = await fetchImage('track', `${stats.mostReplayed.track} ${stats.mostReplayed.artist}`);
    const longestSongImg = await fetchImage('track', `${stats.longestSong.track} ${stats.longestSong.artist}`);
    const artistMostSongsImg = await fetchImage('artist', stats.artistMostSongs.name);
    const topAlbumImg = stats.topAlbums.length > 0 ? await fetchImage('track', `${stats.topAlbums[0].name}`) : null;
    
    let funStatsHtml = '';
    funStatsHtml += createStatCardWithImage('Most Replayed Song', `${stats.mostReplayed.track}\n(${stats.mostReplayed.playCount}x)`, mostReplayedImg);
    funStatsHtml += createStatCardWithImage('Artist with Most Songs', `${stats.artistMostSongs.name}\n(${stats.artistMostSongs.uniqueSongs} songs)`, artistMostSongsImg);
    funStatsHtml += createStatCard('Total Time on Most Replayed', `${mostReplayedHours}h`);
    funStatsHtml += createStatCardWithImage('Song with Most Total Time', `${stats.longestSong.track}\n(${longestSongHours}h ${longestSongMins}m)`, longestSongImg);
    funStatsHtml += createStatCard('By', stats.longestSong.artist);
    
    funStatsHtml += '<div style="grid-column: 1 / -1; border-top: 2px solid rgba(29, 185, 84, 0.2); margin: 20px 0;"></div>';
    
    funStatsHtml += createStatCardWithImage('Most Played Album', `${topAlbumStr}\n(${stats.topAlbums.length > 0 ? stats.topAlbums[0].playCount + ' plays' : 'N/A'})`, topAlbumImg);
    funStatsHtml += createStatCard('Total Unique Albums', stats.albumsArray.length.toLocaleString());
    funStatsHtml += createStatCard('Albums with Plays', stats.albumsArray.filter(a => a.playCount > 0).length.toLocaleString());
    
    funStatsHtml += '<div style="grid-column: 1 / -1; border-top: 2px solid rgba(29, 185, 84, 0.2); margin: 20px 0;"></div>';
    
    funStatsHtml += createStatCard('Songs 1x', stats.oneShotSongs.toLocaleString());
    funStatsHtml += createStatCard('Songs 10+x', stats.songsPlayedMoreThan10.toLocaleString());
    funStatsHtml += createStatCard('Songs 50+x', stats.songsPlayedMoreThan50.toLocaleString());
    funStatsHtml += createStatCard('Songs 100+x', stats.songsPlayedMoreThan100.toLocaleString());
    funStatsHtml += createStatCard('Avg Plays/Song', stats.avgPlaysPerSong);
    funStatsHtml += createStatCard('Completed', `${stats.completedPercentage}%`);
    
    funStatsHtml += '<div style="grid-column: 1 / -1; border-top: 2px solid rgba(29, 185, 84, 0.2); margin: 20px 0;"></div>';
    
    funStatsHtml += createStatCard('Busiest Month', `${stats.busiestMonth.month} (${busyMonthHours}h)`);
    funStatsHtml += createStatCard('Quietest Hour', `${quietestHourNum}:00 Local Time`);
    funStatsHtml += createStatCard('Early Morning', `${earlyMorningHours}h`);
    funStatsHtml += createStatCard('Late Night', `${lateNightHours}h`);
    funStatsHtml += createStatCard('Weekday', `${stats.weekdayPercentage}%`);
    funStatsHtml += createStatCard('Instant Skips', stats.instantSkips.toLocaleString());
    
    funStatsHtml += '<div style="grid-column: 1 / -1; border-top: 2px solid rgba(29, 185, 84, 0.2); margin: 20px 0;"></div>';
    
    funStatsHtml += createStatCard('Most Skipped', mostSkippedInfo);
    funStatsHtml += createStatCard('Never Skipped', stats.neverSkippedSongs.toLocaleString());
    funStatsHtml += createStatCard('Most Variety Day', mostVarietyInfo);
    funStatsHtml += createStatCard('Start Reason', topReasonStr);
    funStatsHtml += createStatCard('Podcasts', `${stats.episodePercentage}%`);
    funStatsHtml += createStatCard('Avg Duration', `${stats.avgListenThroughPercentage}m`);
    funStatsHtml += createStatCard('Monthly Avg', stats.avgPlaysPerMonth);
    funStatsHtml += createStatCard('Since', stats.firstListen ? stats.firstListen.toDateString() : 'N/A');
    funStatsHtml += createStatCard('Days Active', stats.daysSinceStarted.toLocaleString());
    
    funStatsDiv.innerHTML = funStatsHtml;
    
    resultsSection.classList.add('show');
    
    // Show background shapes after analysis is complete
    const backgroundShapes = document.querySelector('.background-shapes');
    if (backgroundShapes) {
        backgroundShapes.classList.add('show');
    }
}

function createStatCard(title, value) {
    return `
        <div style="border: 1px solid rgba(29, 185, 84, 0.3); padding: 15px; border-radius: 5px; background: linear-gradient(135deg, rgba(29, 185, 84, 0.08) 0%, rgba(191, 90, 242, 0.05) 100%);">
            <div style="font-size: 0.9em; color: #b3b3b3; margin-bottom: 5px;">${title}</div>
            <div style="font-size: 1.3em; font-weight: bold; color: #1ed760;">${value}</div>
        </div>
    `;
}

function createStatCardWithImage(title, value, imageUrl) {
    const imageHtml = imageUrl ? `<img src="${imageUrl}" alt="${title}" style="width: 100%; height: auto; aspect-ratio: 1; object-fit: cover; border-radius: 8px 8px 0 0;">` : '';
    const noImageBg = !imageUrl ? `background: linear-gradient(135deg, ${getColorFromText(title)}, ${getColorFromText(title + '2')});` : '';
    
    return `
        <div style="border: 1px solid rgba(29, 185, 84, 0.3); border-radius: 5px; overflow: hidden; background: linear-gradient(135deg, rgba(29, 185, 84, 0.08) 0%, rgba(191, 90, 242, 0.05) 100%); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1); transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); cursor: default;" onmouseover="this.style.borderColor='rgba(30, 215, 96, 1)'; this.style.boxShadow='0 12px 48px rgba(29, 185, 84, 0.3), inset 0 1px 0 rgba(29, 185, 84, 0.2)'; this.style.transform='translateY(-8px)';" onmouseout="this.style.borderColor='rgba(29, 185, 84, 0.3)'; this.style.boxShadow='0 8px 24px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'; this.style.transform='translateY(0)';">
            ${imageHtml}
            <div style="${noImageBg} padding: 15px;">
                <div style="font-size: 0.85em; color: #b3b3b3; margin-bottom: 8px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${title}</div>
                <div style="font-size: 1.2em; font-weight: bold; color: #1ed760;">${value}</div>
            </div>
        </div>
    `;
}

function getColorFromText(text) {
    const colors = [
        '#1DB954', '#191414', '#1ed760', '#b3b3b3', '#1f1f1f', '#05aed5', '#c41e3a', '#f1e07a'
    ];
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

async function fetchImage(type, name) {
    // Generate stylized placeholder images with gradients - no CORS issues
    const colors = [
        { start: '#1DB954', end: '#1ed760' },  // Spotify green
        { start: '#191414', end: '#1f1f1f' },  // Dark
        { start: '#1ed760', end: '#1DB954' },  // Light green
        { start: '#05aed5', end: '#00c9ff' },  // Cyan
        { start: '#c41e3a', end: '#e91e63' },  // Red/Pink
        { start: '#f1e07a', end: '#ffc107' },  // Gold
        { start: '#ff6b6b', end: '#ee5a6f' },  // Coral
        { start: '#4ecdc4', end: '#44a08d' },  // Teal
        { start: '#9b59b6', end: '#8e44ad' },  // Purple
        { start: '#3498db', end: '#2980b9' }   // Blue
    ];
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const colorIndex = Math.abs(hash) % colors.length;
    const { start: color1, end: color2 } = colors[colorIndex];
    
    const initial = name.charAt(0).toUpperCase();
    const displayName = name.length > 25 ? name.substring(0, 25) + '...' : name;
    
    // Create SVG with gradient background, initials, and name
    const svg = `
        <svg width="300" height="300" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
                    <stop offset="100%" style="stop-color:${color2};stop-opacity:1" />
                </linearGradient>
            </defs>
            <rect width="300" height="300" fill="url(#grad)"/>
            <circle cx="150" cy="100" r="50" fill="rgba(255,255,255,0.15)"/>
            <text x="150" y="120" font-size="70" font-weight="bold" text-anchor="middle" fill="white" font-family="Arial, sans-serif">${initial}</text>
            <text x="150" y="250" font-size="20" text-anchor="middle" fill="rgba(255,255,255,0.9)" font-family="Arial, sans-serif" font-weight="500">${displayName}</text>
        </svg>
    `;
    
    const encodedSvg = encodeURIComponent(svg.trim());
    return `data:image/svg+xml,${encodedSvg}`;
}
