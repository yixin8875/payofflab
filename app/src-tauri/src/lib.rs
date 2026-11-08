use std::time::Duration;

const MAX_SYMBOL_LEN: usize = 12;

fn valid_symbol(symbol: &str) -> bool {
    !symbol.is_empty()
        && symbol.len() <= MAX_SYMBOL_LEN
        && symbol
            .chars()
            .all(|c| c.is_ascii_uppercase() || c.is_ascii_digit() || c == '.' || c == '-')
}

/// Fetch CBOE's 15-minute delayed option chain without hitting WebView CORS.
#[tauri::command]
async fn fetch_option_chain(symbol: String) -> Result<String, String> {
    let symbol = symbol.trim().to_uppercase();
    if !valid_symbol(&symbol) {
        return Err("无效的标的代码".into());
    }
    let url =
        format!("https://cdn-api.cboe.com/api/global/delayed_quotes/options/{symbol}.json");
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .user_agent("PayoffLab")
        .build()
        .map_err(|error| format!("行情客户端初始化失败：{error}"))?;
    let response = client
        .get(url)
        .send()
        .await
        .map_err(|error| format!("在线行情连接失败：{error}"))?;
    if !response.status().is_success() {
        return Err(match response.status().as_u16() {
            403 | 404 => "该标的没有在线期权数据".to_string(),
            code => format!("在线行情返回 {code}"),
        });
    }
    response
        .text()
        .await
        .map_err(|error| format!("读取在线行情失败：{error}"))
}

fn valid_date(date: &str) -> bool {
    let bytes = date.as_bytes();
    bytes.len() == 10
        && bytes[4] == b'-'
        && bytes[7] == b'-'
        && bytes
            .iter()
            .enumerate()
            .all(|(index, byte)| index == 4 || index == 7 || byte.is_ascii_digit())
}

/// Fetch Nasdaq's public earnings calendar for one date.
#[tauri::command]
async fn fetch_earnings_day(date: String) -> Result<String, String> {
    let date = date.trim().to_string();
    if !valid_date(&date) {
        return Err("无效的日期".into());
    }
    let url = format!("https://api.nasdaq.com/api/calendar/earnings?date={date}");
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(20))
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36")
        .build()
        .map_err(|error| format!("财报客户端初始化失败：{error}"))?;
    let response = client
        .get(url)
        .header("accept", "application/json, text/plain, */*")
        .header("origin", "https://www.nasdaq.com")
        .header("referer", "https://www.nasdaq.com/")
        .send()
        .await
        .map_err(|error| format!("财报日历连接失败：{error}"))?;
    if !response.status().is_success() {
        return Err(format!("财报日历返回 {}", response.status().as_u16()));
    }
    response
        .text()
        .await
        .map_err(|error| format!("读取财报日历失败：{error}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            fetch_option_chain,
            fetch_earnings_day
        ])
        .run(tauri::generate_context!())
        .expect("error while running PayoffLab");
}

#[cfg(test)]
mod tests {
    use super::{fetch_option_chain, valid_date};

    #[test]
    fn validates_iso_dates() {
        assert!(valid_date("2026-11-17"));
        assert!(!valid_date("2026-1-17"));
        assert!(!valid_date("2026/11/17"));
        assert!(!valid_date(""));
    }

    #[test]
    fn fetches_a_delayed_chain() {
        let body = tauri::async_runtime::block_on(fetch_option_chain("NVDA".into()))
            .expect("CBOE chain should load");
        assert!(body.contains("\"options\""));
        assert!(body.len() > 1_000);
    }
}
