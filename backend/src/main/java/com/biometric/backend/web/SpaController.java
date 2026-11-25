package com.biometric.backend.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * When the built React app is served by Spring Boot (run.bat / run.sh),
 * browser routes like /dashboard must return index.html so React Router can handle them.
 */
@Controller
public class SpaController {

    @GetMapping({"/login", "/signup", "/verify", "/enable-biometrics", "/dashboard", "/dashboard/devices",
            "/dashboard/biometrics", "/signed-out"})
    public String forward() {
        return "forward:/index.html";
    }
}
