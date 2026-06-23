package com.eventflow.backend.util;

import java.util.regex.Pattern;

public final class EmailFormat {

    public static final String REGEX = "^[A-Za-z0-9._%+-]+@(?:[A-Za-z0-9-]+\\.)+[A-Za-z]{2,63}$";
    public static final String MESSAGE = "Email không đúng định dạng";
    public static final Pattern PATTERN = Pattern.compile(REGEX);

    private EmailFormat() {
    }
}