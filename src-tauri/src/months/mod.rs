/// Tiện ích cho tháng dạng chuỗi `YYYY-MM`. So sánh chuỗi trực tiếp là đúng thứ tự
/// thời gian vì định dạng cố định zero-padded.

pub fn validate_month(month: &str) -> Result<(), String> {
    let bytes = month.as_bytes();
    let is_valid = bytes.len() == 7
        && bytes[..4].iter().all(u8::is_ascii_digit)
        && bytes[4] == b'-'
        && bytes[5..].iter().all(u8::is_ascii_digit)
        && matches!(
            &month[5..],
            "01" | "02" | "03" | "04" | "05" | "06" | "07" | "08" | "09" | "10" | "11" | "12"
        );

    if is_valid {
        Ok(())
    } else {
        Err("Tháng không hợp lệ, cần định dạng YYYY-MM.".to_string())
    }
}

pub fn add_months(month: &str, offset: i32) -> Result<String, String> {
    validate_month(month)?;

    let year: i32 = month[..4]
        .parse()
        .map_err(|_| "Tháng không hợp lệ.".to_string())?;
    let month_number: i32 = month[5..]
        .parse()
        .map_err(|_| "Tháng không hợp lệ.".to_string())?;

    let total = year * 12 + (month_number - 1) + offset;
    let next_year = total.div_euclid(12);
    let next_month = total.rem_euclid(12) + 1;

    Ok(format!("{next_year:04}-{next_month:02}"))
}

pub fn months_in_range(start: &str, end: &str) -> Result<Vec<String>, String> {
    validate_month(start)?;
    validate_month(end)?;

    let mut months = Vec::new();
    let mut current = start.to_string();

    while current.as_str() <= end {
        months.push(current.clone());
        current = add_months(&current, 1)?;
    }

    Ok(months)
}

pub fn format_month_label(month: &str) -> String {
    if month.len() == 7 {
        format!("{}/{}", &month[5..], &month[..4])
    } else {
        month.to_string()
    }
}
